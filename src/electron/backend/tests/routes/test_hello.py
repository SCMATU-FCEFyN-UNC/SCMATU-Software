import pytest
from backend.app import create_app

@pytest.fixture
def client():
    """Fixture to create a test client for the Flask app."""
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_hello_route(client):
    """Test that the /hello endpoint returns the expected message."""
    response = client.get("/hello")
    assert response.status_code == 200

    json_data = response.get_json()
    assert json_data is not None
    assert json_data["message"] == "Hello from Python backend!"