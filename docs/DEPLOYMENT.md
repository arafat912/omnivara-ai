# OMNIVARA Deployment Guide

This guide prepares the web client and API for a first hosted test. A successful GitHub commit does not mean the services have already been deployed.

## 1. Deploy the API on Render

1. Push the repository to GitHub.
2. In Render, create a new Blueprint and select this repository. Render will read `render.yaml`.
3. Set `CORS_ORIGINS` to the exact deployed frontend origin, with no trailing slash (for example, `https://your-app.vercel.app`).
4. Set `DATABASE_URL` to a managed PostgreSQL connection string. Do not use the default SQLite file for a public deployment because an ephemeral instance filesystem is not durable.
5. Add an OpenAI or Gemini API key if live model responses are required.
6. Wait for deployment, then open `/health`. A healthy response should contain `status: ok`.

## 2. Deploy the web app on Vercel

1. Import this GitHub repository into Vercel.
2. Set the Root Directory to `frontend`.
3. Set `NEXT_PUBLIC_API_URL` to the deployed API origin, such as `https://your-api.onrender.com` (no trailing slash).
4. Deploy the project.
5. Register a test account and verify login, chat, and conversation history.

## 3. Verify

- Open the API `/health` endpoint.
- Open the API `/docs` endpoint and inspect the available routes.
- Create a test account in the web app.
- Send a message and confirm the conversation appears in chat history.
- Test a second account to confirm it cannot access the first account's conversations.

## Production checklist

- Use PostgreSQL and add Alembic migrations before schema changes.
- Restrict CORS to the exact production web origin.
- Keep JWT and model API keys in the hosting provider's secret manager; never commit them.
- Enable HTTPS, backups, rate limits, monitoring, and account recovery.
- Replace browser localStorage token storage with secure HttpOnly cookies and CSRF protection.
- Review privacy, data retention, and user deletion requirements.
- Test Android separately with the deployed API URL and a physical device.

Render and Vercel account setup, secret entry, domain configuration, and final deployment approval require the repository owner.