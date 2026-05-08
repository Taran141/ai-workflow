# Architecture Overview

## System Design

The application is intentionally split into two deployable units:

- `frontend`: Angular SPA for dashboards, builder flows, and real-time UX
- `backend`: Express + Socket.IO API that owns auth, persistence, AI orchestration, and events

## Backend Layers

### Controller Layer

HTTP entrypoints map requests to services and return transport-safe responses.

### Service Layer

Contains business rules:

- authentication and token issuance
- AI prompt parsing and workflow generation
- workflow/task orchestration
- notification emission
- activity log generation

### Repository Layer

Repositories isolate Mongoose data access so persistence can evolve independently from domain logic.

### Middleware Layer

- JWT auth
- role checks
- error handling
- validation
- rate limiting
- request logging

### Event Layer

A domain event bus decouples workflow/task mutations from side effects such as notification creation, activity tracking, socket broadcasts, and retry handling.

### Socket Layer

Socket.IO manages:

- authenticated client connections
- room scoping by user and workflow
- real-time broadcasts for workflow, task, and activity updates

## Frontend Design

The Angular app is organized by feature modules with a small `core` layer:

- `auth`
- `dashboard`
- `workflows`
- `notifications`
- `activity`
- `shared`

State is handled with RxJS `BehaviorSubject`s in small store-like services. This keeps the implementation lightweight while preserving predictable reactive updates.

## Scalability Choices

- Room-based socket broadcasts reduce unnecessary fan-out
- Repositories keep service logic persistence-agnostic
- Event-driven side effects make background processing and queues easy to extend
- Mongoose indexes optimize common dashboard/filter queries
- Cursor-friendly pagination patterns support growth
- Redis and BullMQ hooks are prepared for future job/offline workloads

## Why Sockets

Workflows, approvals, and tasks are collaborative and operationally sensitive. Polling would add latency and unnecessary traffic. Socket.IO provides:

- low-latency task status propagation
- live activity feed updates
- instant notification delivery
- reconnect behavior for intermittent networks

## Future Scaling

- Move event handling to BullMQ workers for large async workloads
- Add Redis-backed Socket.IO adapter for horizontal scaling
- Split workflow/notification services into separate deployables
- Introduce webhook workers and outbound email services
- Add multi-tenant isolation and billing boundaries

