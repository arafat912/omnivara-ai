# OMNIVARA AI
**Intelligence Without Limits.**

A multilingual AI assistant starter for Web and Android.

## Stack
- Backend: Python + FastAPI
- Web: Next.js + React
- Android: Expo + React Native
- Database: SQLAlchemy (SQLite development default; PostgreSQL configurable)
- Authentication: Argon2 password hashing + JWT
- AI providers: OpenAI and Google Gemini

## Backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
Copy root `.env.example` to `backend/.env` (or configure environment variables in your process). Set a strong unique JWT_SECRET. Then:
```bash
uvicorn app.main:app --reload --port 8000
```

## Web
```bash
cd frontend
npm install
npm run dev
```

## Android
```bash
cd mobile
npm install
npx expo start
```
For a physical Android phone, set EXPO_PUBLIC_API_URL to your computer's LAN IP.

## Deployment
- [Quick Start](docs/QUICKSTART.md)
- [Web + API Deployment Guide](docs/DEPLOYMENT.md)
- Render API blueprint: `render.yaml`

For the web deployment, set `NEXT_PUBLIC_API_URL` to the deployed API origin. For Android, set `EXPO_PUBLIC_API_URL` to the same API origin. Configure `CORS_ORIGINS` on the API to the exact deployed web origin.

## API
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me (Bearer token)
- POST /api/v1/chat (Bearer token; saves messages)
- GET /api/v1/conversations (Bearer token)
- GET /api/v1/conversations/{id} (owner only)
- DELETE /api/v1/conversations/{id} (owner only)
- GET /health

## Security
Use HTTPS, a unique JWT secret, strict CORS, rate limiting, backups, migrations and privacy/retention controls before public deployment. The current starter uses localStorage for the web access token; a production web app should move to secure HttpOnly cookies and add CSRF protection. Email verification, password reset and refresh-token rotation are not implemented yet.
