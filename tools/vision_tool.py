# /tools/vision_tool.py

import ollama
import pyautogui
import base64
import io
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def analyze_screen(question: str) -> dict:
    """
    Captures the screen, sends it to a multimodal model to be analyzed, and returns a text description.

    Args:
        question: The specific question to ask the vision model about the screen content.

    Returns:
        A dictionary with the status and the model's text-based analysis of the screen.
    """
    logging.info(f"Analyzing screen with question: '{question}'")
    try:
        # 1. Capture a screenshot
        screenshot = pyautogui.screenshot()

        # 2. Convert the screenshot to a byte buffer
        buffer = io.BytesIO()
        screenshot.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()

        # 3. Call the Ollama model (e.g., llava)
        response = ollama.chat(
            model='llava', # Assumes 'llava' or similar vision model is pulled in Ollama
            messages=[
                {
                    'role': 'user',
                    'content': question,
                    'images': [image_bytes]
                }
            ]
        )

        analysis = response['message']['content']
        logging.info("Successfully received analysis from vision model.")
        return {"status": "success", "result": analysis}

    except Exception as e:
        logging.error(f"An error occurred during screen analysis: {e}")
        return {"status": "error", "result": str(e)}
