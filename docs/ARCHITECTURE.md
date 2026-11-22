# OMNIVARA Architecture

## Current request flow
1. User registers or logs in through /api/v1/auth.
2. Backend hashes passwords with Argon2 and issues a signed JWT.
3. Protected endpoints validate the bearer token and resolve the current user.
4. Chat requests are saved as user and assistant messages in SQLAlchemy tables.
5. Conversation queries are always scoped to the authenticated user's ID.

## Database
SQLite is the development default. Set DATABASE_URL to a PostgreSQL SQLAlchemy URL for deployment. Tables are currently created at startup; use Alembic migrations before production schema changes.

## Security notes
- Set a unique, high-entropy JWT_SECRET before deployment.
- Use HTTPS in production.
- Keep provider keys and DATABASE_URL credentials server-side.
- Add rate limits, email verification, password reset, refresh-token rotation, audit logs and backups before public launch.
- Configure CORS to exact trusted origins.
- Chat history contains personal data; add retention/export/delete policies and obtain consent.
- Never store passwords in plaintext.
