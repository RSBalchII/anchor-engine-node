#!/usr/bin/env python3
"""
Script to run all ECE agents simultaneously using uvicorn for FastAPI apps.
This script starts all ECE agents on their respective ports.
"""

import subprocess
import sys
import os
from pathlib import Path
import time
import threading
import signal
import socket

def start_agent(agent_name, command, working_dir):
    """Start an agent in a subprocess."""
    print(f"Starting {agent_name} with command: {' '.join(command)} in {working_dir}")

    try:
        # Change to the working directory for this agent
        original_cwd = os.getcwd()
        os.chdir(working_dir)

        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )

        # Restore the original working directory
        os.chdir(original_cwd)

        # Print output from the process
        def print_output(pipe, prefix):
            for line in iter(pipe.readline, ""):
                print(f"[{prefix}] {line.strip()}")
            pipe.close()

        stdout_thread = threading.Thread(
            target=print_output, args=(process.stdout, f"{agent_name}-OUT")
        )
        stderr_thread = threading.Thread(
            target=print_output, args=(process.stderr, f"{agent_name}-ERR")
        )

        stdout_thread.start()
        stderr_thread.start()

        return process, stdout_thread, stderr_thread
    except Exception as e:
        print(f"Failed to start {agent_name}: {e}")
        return None, None, None


def main():
    # Get the project root directory
    project_root = Path(__file__).parent.parent
    ece_dir = project_root / "ece"

    if not ece_dir.exists():
        print(f"ERROR: ECE directory does not exist: {ece_dir}")
        sys.exit(1)

    # Python executable to use
    python_exe = sys.executable
    uvicorn_exe = [python_exe, "-m", "uvicorn"]

    def wait_for_port(port, service_name, timeout=30):
        """Wait for a port to become available."""

        print(
            f"Waiting for {service_name} port {port} to become available... (timeout: {timeout}s)"
        )

        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                    sock.settimeout(1)  # Reduced from 2 seconds
                    result = sock.connect_ex(("127.0.0.1", int(port)))
                    if result == 0:
                        print(f"[SUCCESS] {service_name} port {port} is available")
                        return True
            except Exception as e:
                pass  # Continue waiting

            time.sleep(0.5)  # Reduced from 2 seconds to speed up communication

        print(f"Timeout waiting for {service_name} port {port}")
        return False

    # Define agents to start with their module paths and ports in dependency order
    # Distiller must start first since other agents depend on it
    ordered_agents = [
        {
            "name": "Distiller",
            "module": "ece.agents.tier3.distiller.distiller_agent:app",
            "port": os.getenv("DISTILLER_PORT", "8001"),
            "working_dir": project_root,
        },
        {
            "name": "Orchestrator",
            "module": "ece.agents.tier1.orchestrator.main:app",
            "port": os.getenv("ORCHESTRATOR_PORT", "8000"),
            "working_dir": project_root,
        },
        {
            "name": "QLearning",
            "module": "ece.agents.tier3.qlearning.qlearning_app:app",  # Using qlearning_app.py
            "port": os.getenv("QLEARNING_PORT", "8002"),
            "working_dir": project_root,
        },
        {
            "name": "Archivist",
            "module": "ece.agents.tier3.archivist.archivist_agent:app",
            "port": os.getenv("ARCHIVIST_PORT", "8003"),
            "working_dir": project_root,
        },
        {
            "name": "Injector",
            "module": "ece.agents.tier3.injector.main:app",  # Using main.py in injector
            "port": os.getenv("INJECTOR_PORT", "8004"),
            "working_dir": project_root,
        },
        {
            "name": "FileSystem",
            "module": "ece.agents.tier2.filesystem_agent:app",
            "port": os.getenv("FILESYSTEM_PORT", "8006"),
            "working_dir": project_root,
        },
        {
            "name": "WebSearch",
            "module": "ece.agents.tier2.web_search_app:app",  # Using web_search_app.py
            "port": os.getenv("WEBSEARCH_PORT", "8007"),
            "working_dir": project_root,
        },
        {
            "name": "Git",
            "module": "ece.agents.tier2.git_agent:app",  # Using git_agent.py
            "port": os.getenv("GIT_PORT", "8009"),
            "working_dir": project_root,
        },
    ]

    # Start agents with special attention to Distiller
    processes = []
    threads = []

    # Start Distiller agent first with extended delay for initialization
    distiller_agent = ordered_agents[0]  # Distiller is first in the list
    print(f"Starting {distiller_agent['name']} agent on port {distiller_agent['port']}...")

    # Construct the uvicorn command for Distiller with increased startup time
    distiller_command = uvicorn_exe + [
        distiller_agent["module"],
        "--host",
        "127.0.0.1",
        "--port",
        distiller_agent["port"],
        "--reload",  # Enable auto-reload for development
    ]

    process, stdout_thread, stderr_thread = start_agent(
        distiller_agent["name"], distiller_command, distiller_agent["working_dir"]
    )

    if process:
        processes.append((distiller_agent["name"], process))
        threads.extend([stdout_thread, stderr_thread])
        print(f"Waiting for Distiller agent to initialize...")
        time.sleep(8)  # Extended delay for Distiller to fully start
    else:
        print(f"Failed to start {distiller_agent['name']}, stopping other agents...")
        sys.exit(1)

    # Verify Distiller is responding before continuing
    if not wait_for_port(distiller_agent["port"], distiller_agent["name"], timeout=60):
        print(f"Distiller agent might not be accessible on port {distiller_agent['port']} - continuing anyway...")
    else:
        print("Distiller agent is responsive, continuing with other agents...")

    # Start the remaining agents
    for agent in ordered_agents[1:]:  # Skip Distiller since it's already started
        print(f"Starting {agent['name']} agent on port {agent['port']}...")

        # Construct the uvicorn command
        command = uvicorn_exe + [
            agent["module"],
            "--host",
            "127.0.0.1",
            "--port",
            agent["port"],
            "--reload",  # Enable auto-reload for development
        ]

        process, stdout_thread, stderr_thread = start_agent(
            agent["name"], command, agent["working_dir"]
        )

        if process:
            processes.append((agent["name"], process))
            threads.extend([stdout_thread, stderr_thread])
            time.sleep(3)  # Delay to allow agent to fully start
        else:
            print(f"Failed to start {agent['name']}, stopping other agents...")
            # Stop all previously started agents
            for _, proc in processes:
                proc.terminate()
            sys.exit(1)

    print(f"Started {len(processes)} agents successfully")

    # Give all agents some time to fully initialize
    print("Waiting for agents to fully initialize...")
    time.sleep(10)

    # Verify agents are running by checking if the ports are open

    for agent in ordered_agents:
        port = int(agent["port"])
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            result = sock.connect_ex(("127.0.0.1", port))
            if result == 0:
                print(f"{agent['name']} is accessible on port {port}")
            else:
                print(
                    f"{agent['name']} might not be accessible on port {port}"
                )

    # Wait for any process to exit
    try:
        while True:
            time.sleep(1)
            # Check if any process has terminated
            for name, proc in processes:
                if proc.poll() is not None:
                    print(
                        f"ERROR: {name} process terminated with code {proc.returncode}"
                    )
                    print("Shutting down other agents...")
                    # Terminate all other processes
                    for _, other_proc in processes:
                        if other_proc != proc and other_proc.poll() is None:
                            other_proc.terminate()
                    sys.exit(1)
    except KeyboardInterrupt:
        print("Received interrupt signal, shutting down agents...")
        # Terminate all processes
        for name, proc in processes:
            print(f"Terminating {name}...")
            proc.terminate()

        # Wait for processes to terminate
        for name, proc in processes:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print(f"{name} did not terminate gracefully, killing...")
                proc.kill()

        print("All agents terminated")
        sys.exit(0)


if __name__ == "__main__":
    main()
