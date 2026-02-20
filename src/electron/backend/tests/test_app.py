import pytest
from ..app import create_app

@pytest.fixture
def client():
    """Fixture to create a test client for the Flask app."""
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_app_creates_successfully(client):
    """Test that the app creates successfully and a known route returns 404."""
    # Instead of testing a non-existent root route, test that the app is created
    # and that a request to a non-existent route returns 404
    response = client.get("/non_existent_route")
    assert response.status_code == 404
    
    # Test that CORS is configured (optional)
    response = client.options("/non_existent_route")
    assert "Access-Control-Allow-Origin" in response.headers

def test_cors_configuration(client):
    """Test that CORS is properly configured."""
    response = client.options("/non_existent_route")
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5123"