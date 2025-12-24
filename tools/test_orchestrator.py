import unittest
from unittest.mock import patch, MagicMock
from orchestrator import Orchestrator, MLCConnectionError

class TestOrchestrator(unittest.TestCase):

    def setUp(self):
        self.orc = Orchestrator()

    @patch('requests.get')
    def test_load_mlc_model_success(self, mock_get):
        # Mock successful bridge connection
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": [{"id": "webgpu-chat"}]}
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        result = self.orc.load_mlc_model("my-model")
        self.assertTrue(result)
        self.assertEqual(self.orc.active_model, "my-model")

    @patch('requests.get')
    def test_load_mlc_model_failure(self, mock_get):
        # Mock connection error
        mock_get.side_effect = Exception("Connection refused")
        
        with self.assertRaises(MLCConnectionError):
            self.orc.load_mlc_model("my-model")

    @patch('requests.post')
    def test_invoke_mlc_inference_success(self, mock_post):
        self.orc.active_model = "test-model"
        
        # Mock successful inference
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Hello from MLC"}}]
        }
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        output = self.orc.invoke_mlc_inference("Hi")
        self.assertEqual(output, "Hello from MLC")

    def test_invoke_without_load(self):
        with self.assertRaises(ValueError):
            self.orc.invoke_mlc_inference("Hi")

if __name__ == '__main__':
    unittest.main()
