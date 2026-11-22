# OMNIVARA AI
**Intelligence Without Limits.**

A multilingual AI assistant starter for Web and Android.

## Stack
- Backend: Python + FastAPI
- Web: Next.js + React
- Android: Expo + React Native
- AI providers: OpenAI and Google Gemini

## Quick start
Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Web:
```bash
cd frontend
npm install
npm run dev
```
Android:
```bash
cd mobile
npm install
npx expo start
```
For a physical Android phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, not localhost.

Copy `.env.example` to local `.env` and add provider keys. Never commit real API keys or passwords.

Current endpoints: `GET /health`, `POST /api/v1/chat`.

This is an early starter, not production-ready. Authentication, chat persistence, rate limiting, monitoring, strict deployment CORS and security review remain future work.
