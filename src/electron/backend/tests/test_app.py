import pytest
from ..app import create_app

@pytest.fixture
def client():
    """Fixture to create a test client for the Flask app."""
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_home_route(client):
    """Test that the root endpoint (/) returns the expected response."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"Hello from Waitress!" in response.data
