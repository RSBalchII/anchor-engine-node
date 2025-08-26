import time
import threading
import logging
from agents.distiller_agent import DistillerAgent
from agents.archivist_agent import ArchivistAgent
from config import MAIN_CONTEXT_FILE
from tools.file_io import read_last_n_chars
from tools.blackboard import Blackboard

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AgentOrchestrator:
    def __init__(self):
        self.distiller_agent = DistillerAgent()
        self.archivist_agent = ArchivistAgent()
        self.blackboard = Blackboard()
        logging.info("AgentOrchestrator initialized.")

    def _run_cycle(self):
        logging.info("AgentOrchestrator: Starting new cycle...")
        context_to_distill = read_last_n_chars(MAIN_CONTEXT_FILE, 5000)
        self.distiller_agent.orchestrate_distillation_crew(context_to_distill=context_to_distill)

        scout_task = {'type': 'web_scrape', 'url': 'https://www.deeplearning.ai/the-batch/'}
        self.blackboard.post_task('scout_tasks', scout_task)
        logging.info('Orchestrator: Posted web scrape task for Scout.')

    def start(self):
        logging.info("AgentOrchestrator: Starting background orchestration...")
        try:
            while True:
                self._run_cycle()
                logging.info("AgentOrchestrator: Cycle complete. Sleeping for 60 seconds...")
                time.sleep(60)
        except KeyboardInterrupt:
            logging.info("AgentOrchestrator: Orchestration stopped by user (KeyboardInterrupt).")
        except Exception as e:
            logging.error(f"AgentOrchestrator: An unexpected error occurred during orchestration: {e}")

if __name__ == "__main__":
    orchestrator = AgentOrchestrator()
    orchestrator.start()
