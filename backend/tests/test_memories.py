from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def test_user_can_create_list_and_delete_own_memories():
    with TestClient(app) as client:
        email = f"{uuid4().hex}@example.com"
        registered = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "StrongPass123"},
        )
        assert registered.status_code == 201
        headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}

        created = client.post(
            "/api/v1/memories",
            headers=headers,
            json={"content": "I prefer Bengali answers"},
        )
        assert created.status_code == 201
        memory_id = created.json()["id"]

        listed = client.get("/api/v1/memories", headers=headers)
        assert listed.status_code == 200
        assert any(item["content"] == "I prefer Bengali answers" for item in listed.json())

        deleted = client.delete(f"/api/v1/memories/{memory_id}", headers=headers)
        assert deleted.status_code == 204
        assert client.get("/api/v1/memories", headers=headers).json() == []


def test_memory_requires_authentication():
    with TestClient(app) as client:
        response = client.get("/api/v1/memories")
        assert response.status_code == 401
