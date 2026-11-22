# OMNIVARA Quick Start

This repository contains the OMNIVARA web and Android clients and its FastAPI backend.

## Configure the backend

Create `backend/.env` with the following settings:

```env
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
AI_PROVIDER=auto
OPENAI_API_KEY=
GEMINI_API_KEY=
DATABASE_URL=sqlite:///./omnivara.db
JWT_SECRET=replace-with-a-long-random-value
```

Add an API key for OpenAI or Gemini to get live model responses. Without a key, the backend responds in demo mode.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API documentation: `http://localhost:8000/docs`.

## Start the web app

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` if the backend is hosted somewhere else.

## Start the Android app

```bash
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to the backend address:

- Android emulator: `http://10.0.2.2:8000`
- Physical Android phone: use the computer's LAN IP, such as `http://192.168.1.20:8000`, with both devices on the same Wi-Fi network.

## Run backend tests

```bash
cd backend
pytest -q
```

## Before public launch

This is a development starter, not yet a production service. Configure HTTPS and unique production secrets, restrict CORS, move to PostgreSQL with schema migrations, add rate limiting and account recovery, review session policies, and test both clients on real devices. Do not commit API keys.