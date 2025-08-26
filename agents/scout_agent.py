import redis
import json
import time
import logging
from config import TIER_1_SCOUT_MODEL
from tools.web_search import web_search
from tools.blackboard import Blackboard

class ScoutAgent:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        self.model = TIER_1_SCOUT_MODEL
        self.task_queue = 'scout_tasks'
        self.results_stream = 'blackboard_stream'
        self.blackboard = Blackboard()

    def start_scouting(self):
        logging.info("ScoutAgent: Starting scouting loop...")
        while True:
            # Wait indefinitely for a task from the scout_tasks list
            task = self.redis_client.blpop(self.task_queue, timeout=0)
            if task:
                queue_name, task_data = task
                logging.info(f"ScoutAgent: Received task from {queue_name.decode()}: {task_data.decode()}")
                try:
                    task_json = json.loads(task_data.decode())
                    task_type = task_json.get('type')

                    if task_type == 'web_scrape':
                        url = task_json.get('url')
                        if url:
                            logging.info(f"ScoutAgent: Performing web scrape for URL: {url}")
                            search_result = web_search(query=url) # Assuming web_search can take a URL directly
                            self.blackboard.post_message(source_agent='ScoutAgent', content=search_result)
                            logging.info(f"ScoutAgent: Posted web scrape result to blackboard.")
                        else:
                            logging.warning("ScoutAgent: Web scrape task received without a URL.")
                    else:
                        logging.warning(f"ScoutAgent: Unknown task type received: {task_type}")
                except json.JSONDecodeError:
                    logging.error(f"ScoutAgent: Failed to decode task data as JSON: {task_data.decode()}")
                except Exception as e:
                    logging.error(f"ScoutAgent: An error occurred during task processing: {e}")

if __name__ == "__main__":
    scout = ScoutAgent()
    scout.start_scouting()