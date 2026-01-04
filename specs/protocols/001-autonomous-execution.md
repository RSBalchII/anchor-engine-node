# Protocol 001: Autonomous Execution & Service Verification

## The Rule
When executing any service, server, or long-running task, the Agent MUST:

1.  **Isolate Logs:** Create a dedicated log file (e.g., `logs/startup_checks.log`).
2.  **Detached Execution:** Launch the process in background/detached mode.
    - *Linux/Mac:* `nohup node src/index.js > ../logs/server.log 2>&1 &`
    - *Windows:* `Start-Process node -ArgumentList "src/index.js" -RedirectStandardOutput "../logs/server.log" -WindowStyle Hidden`
3.  **The "Pulse Check":**
    - Wait 5 seconds.
    - Read the log file to check for "Error" or "Exception".
4.  **Verification:**
    - If the log shows "Listening on port X", perform a HTTP GET to `/health` to confirm.
    - ONLY then declare success.