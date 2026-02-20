from unittest.mock import patch, MagicMock
import pytest
from flask import Flask
from backend.routes.folders_routes import folders_bp


@pytest.fixture
def client():
    """Create a test client with the folders blueprint registered."""
    app = Flask(__name__)
    app.register_blueprint(folders_bp)
    return app.test_client()


class TestFoldersRoutes:
    def test_select_folder_success(self, client):
        """Test successful folder selection."""
        test_folder_path = "/home/user/Documents/test_folder"
        
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.return_value = test_folder_path
            response = client.get("/select-folder")
            
            assert response.status_code == 200
            assert response.json["status"] == "success"
            assert response.json["folder"] == test_folder_path
            assert response.json["message"] == "Folder selected successfully"
            mock_dialog.assert_called_once_with("Select folder for saving resonance sweep results")

    def test_select_folder_no_selection(self, client):
        """Test when user cancels folder selection."""
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.return_value = None
            response = client.get("/select-folder")
            
            assert response.status_code == 200
            assert response.json["status"] == "error"
            assert "No folder selected or selection timed out" in response.json["message"]
            mock_dialog.assert_called_once_with("Select folder for saving resonance sweep results")

    def test_select_folder_timeout(self, client):
        """Test when folder selection times out."""
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            # Simulate timeout by returning None
            mock_dialog.return_value = None
            response = client.get("/select-folder")
            
            assert response.status_code == 200
            assert response.json["status"] == "error"
            assert "No folder selected or selection timed out" in response.json["message"]

    def test_select_folder_empty_string(self, client):
        """Test when folder selection returns empty string."""
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.return_value = ""
            response = client.get("/select-folder")
            
            assert response.status_code == 200
            assert response.json["status"] == "error"
            assert "No folder selected or selection timed out" in response.json["message"]

    def test_select_folder_with_special_characters(self, client):
        """Test folder path with special characters."""
        test_folder_path = "C:\\Users\\Usuario\\Documentos\\Mediciones (2025-02-19)\\data"
        
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.return_value = test_folder_path
            response = client.get("/select-folder")
            
            assert response.status_code == 200
            assert response.json["status"] == "success"
            assert response.json["folder"] == test_folder_path

    def test_run_file_dialog_success(self, client):
        """Test run_file_dialog with successful folder selection."""
        from backend.routes.folders_routes import run_file_dialog
        
        test_path = "/test/folder/path"
        with patch("backend.routes.folders_routes.Process") as mock_process_class:
            # Mock the process instance
            mock_process_instance = MagicMock()
            mock_process_class.return_value = mock_process_instance
            mock_process_instance.is_alive.return_value = False
            
            # Mock the queue
            with patch("backend.routes.folders_routes.Queue") as mock_queue_class:
                mock_queue = MagicMock()
                mock_queue_class.return_value = mock_queue
                mock_queue.get_nowait.return_value = test_path
                
                result = run_file_dialog("Test title")
                
                assert result == test_path
                mock_process_instance.start.assert_called_once()
                mock_process_instance.join.assert_called()

    def test_run_file_dialog_timeout(self, client):
        """Test run_file_dialog when process times out."""
        from backend.routes.folders_routes import run_file_dialog
        
        with patch("backend.routes.folders_routes.Process") as mock_process_class:
            # Mock the process instance to simulate timeout
            mock_process_instance = MagicMock()
            mock_process_class.return_value = mock_process_instance
            mock_process_instance.is_alive.return_value = True
            
            result = run_file_dialog("Test title")
            
            assert result is None
            mock_process_instance.terminate.assert_called_once()
            mock_process_instance.join.assert_called()

    def test_run_file_dialog_exception(self, client):
        """Test run_file_dialog when queue throws exception."""
        from backend.routes.folders_routes import run_file_dialog
        
        with patch("backend.routes.folders_routes.Process") as mock_process_class:
            mock_process_instance = MagicMock()
            mock_process_class.return_value = mock_process_instance
            mock_process_instance.is_alive.return_value = False
            
            with patch("backend.routes.folders_routes.Queue") as mock_queue_class:
                mock_queue = MagicMock()
                mock_queue_class.return_value = mock_queue
                # Simulate queue.get_nowait() raising an exception
                mock_queue.get_nowait.side_effect = Exception("Queue empty")
                
                result = run_file_dialog("Test title")
                
                assert result is None

    def test_select_folder_endpoint_exception_handling(self, client):
        """Test that endpoint returns error response when exception occurs."""
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.side_effect = Exception("Dialog error")
            
            # The endpoint does not catch the exception, so Flask will handle it
            response = client.get("/select-folder")
            
            # Flask returns 500 for unhandled exceptions
            assert response.status_code == 500

    def test_select_folder_response_headers(self, client):
        """Test that response has correct content type."""
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.return_value = "/test/path"
            response = client.get("/select-folder")
            
            assert response.content_type == "application/json"

    def test_select_folder_with_windows_path(self, client):
        """Test with Windows-style absolute path."""
        test_folder_path = "D:\\Projects\\SCMATU\\results\\2025-02-19"
        
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.return_value = test_folder_path
            response = client.get("/select-folder")
            
            assert response.status_code == 200
            assert response.json["status"] == "success"
            assert response.json["folder"] == test_folder_path

    def test_select_folder_with_unix_path(self, client):
        """Test with Unix-style absolute path."""
        test_folder_path = "/home/user/projects/scmatu/results/2025-02-19"
        
        with patch("backend.routes.folders_routes.run_file_dialog") as mock_dialog:
            mock_dialog.return_value = test_folder_path
            response = client.get("/select-folder")
            
            assert response.status_code == 200
            assert response.json["status"] == "success"
            assert response.json["folder"] == test_folder_path
