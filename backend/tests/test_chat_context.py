from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.api.routes import chat as chat_routes


def test_chat_sends_previous_turns_as_context(monkeypatch):
    captured = []

    async def fake_generate_reply(message, language="auto", history=None, image_data=None):
        captured.append((message, history or []))
        return "Test response", "test"

    monkeypatch.setattr(chat_routes, "generate_reply", fake_generate_reply)

    with TestClient(app) as client:
        email = f"{uuid4().hex}@example.com"
        registered = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "StrongPass123"},
        )
        assert registered.status_code == 201
        headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}

        first = client.post(
            "/api/v1/chat",
            headers=headers,
            json={"message": "My name is Arafat", "language": "en"},
        )
        assert first.status_code == 200
        conversation_id = first.json()["conversation_id"]

        second = client.post(
            "/api/v1/chat",
            headers=headers,
            json={
                "message": "What is my name?",
                "language": "en",
                "conversation_id": conversation_id,
            },
        )
        assert second.status_code == 200

    assert captured[0][1] == []
    assert captured[1][0] == "What is my name?"
    assert captured[1][1] == [
        {"role": "user", "content": "My name is Arafat"},
        {"role": "assistant", "content": "Test response"},
    ]
