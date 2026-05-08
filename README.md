# AI Workflow Automation & Real-Time Event System

Production-style SaaS monorepo for AI-generated workflow automation, real-time event streaming, and collaborative task orchestration.

## Monorepo Structure

```text
.
├── backend
├── frontend
├── docker-compose.yml
└── docs
```

## Highlights

- Clean backend architecture with controllers, services, repositories, middleware, events, and sockets
- Angular modular frontend with feature modules, shared components, route guards, and RxJS state
- AI-driven workflow generation using OpenAI-compatible APIs
- Real-time workflow, task, notification, and activity updates with Socket.IO
- JWT auth with role-based access
- MongoDB persistence with indexes and audit trails
- Docker-ready local development stack
- Test scaffolding for API, component, and socket validation

## Quick Start

### 1. Environment

Copy the environment templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Run with Docker

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`

### 3. Run Locally Without Docker

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm start
```

## Demo Flow

1. Register a user.
2. Login and store JWT.
3. Create a workflow via AI prompt such as `Create employee onboarding workflow`.
4. Watch the dashboard update in real time as events and notifications are emitted.
5. Update tasks and view live activity feed changes across connected clients.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)

## Testing

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
```

## Interview Framing

This project is designed to be resume-worthy for senior/product engineering interviews:

- AI-assisted workflow orchestration
- Event-driven backend architecture
- Realtime multi-client synchronization
- Production concerns: validation, rate limiting, logging, retries, Docker, RBAC

