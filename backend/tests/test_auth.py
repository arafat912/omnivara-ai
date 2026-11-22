from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_login_and_profile():
    import uuid
    email = f"{uuid.uuid4().hex}@example.com"
    with TestClient(app) as client:
        registered = client.post("/api/v1/auth/register", json={"email": email, "password": "StrongPass123"})
        assert registered.status_code == 201
        token = registered.json()["access_token"]
        assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200
        logged_in = client.post("/api/v1/auth/login", json={"email": email, "password": "StrongPass123"})
        assert logged_in.status_code == 200
        assert client.post("/api/v1/auth/login", json={"email": email, "password": "wrongpass"}).status_code == 401
