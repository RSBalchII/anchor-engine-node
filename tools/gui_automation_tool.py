# /tools/gui_automation_tool.py

import pyautogui
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def move_mouse(x: int, y: int) -> dict:
    """Moves the mouse cursor to the specified X, Y coordinates."""
    try:
        pyautogui.moveTo(x, y, duration=0.25)
        return {"status": "success", "result": f"Mouse moved to ({x}, {y})."}
    except Exception as e:
        return {"status": "error", "result": str(e)}

def click_mouse(button: str = 'left') -> dict:
    """Performs a mouse click with the specified button ('left', 'right', 'middle')."""
    try:
        pyautogui.click(button=button)
        return {"status": "success", "result": f"'{button}' mouse button clicked."}
    except Exception as e:
        return {"status": "error", "result": str(e)}

def type_text(text: str) -> dict:
    """Types the given text at the current cursor location."""
    try:
        pyautogui.write(text, interval=0.05)
        return {"status": "success", "result": f"Typed text: '{text}'"}
    except Exception as e:
        return {"status": "error", "result": str(e)}
