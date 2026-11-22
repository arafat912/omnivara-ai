# OMNIVARA Architecture

## Current request flow
1. Web or Android sends POST /api/v1/chat.
2. FastAPI validates the request using Pydantic.
3. Provider adapter selects OpenAI or Gemini when configured.
4. API returns reply text and provider name.

## Planned modules
- Authentication and permissions
- Consent-based memory and retrieval
- Voice input/output
- Permissioned agents and tool execution
- Database persistence and migrations
- Logs, metrics and monitoring

## Security principles
- Never expose provider keys in browser or mobile bundles.
- Obtain consent before storing long-term personal memory.
- Require confirmation for consequential external actions.
- Add authentication, rate limiting and strict CORS before public deployment.
