# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

### POST `/auth/register`

Registers a user. The role is chosen by the server: the first account becomes `admin`, every later account
is a `user` (admins can promote people with `PATCH /users/:id/role`).

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password@123",
  "phone": "+91 9876543210"
}
```

### POST `/auth/login`

Returns JWT and profile.

## Workflows

### GET `/workflows`

Query params:

- `page`
- `limit`
- `search`
- `status`
- `sortBy`
- `sortOrder`

### POST `/workflows`

Creates a manual workflow.

### POST `/workflows/generate`

Generates a workflow from an AI prompt.

```json
{
  "prompt": "Create employee onboarding workflow"
}
```

### GET `/workflows/:id`

Returns workflow details and task summary.

### PATCH `/workflows/:id`

Updates workflow metadata.

### DELETE `/workflows/:id`

Soft-removes workflow access for simple CRUD flows.

## Tasks

### POST `/tasks`

Creates a task.

### PATCH `/tasks/:id`

Updates status, priority, assignee, or deadline.

### DELETE `/tasks/:id`

Deletes a task.

## Notifications

### GET `/notifications`

Returns paginated notifications for the current user.

### PATCH `/notifications/:id/read`

Marks a notification as read.

## Users

### GET `/users`

Lists workspace members. Phone numbers are only included for admins and for your own account.

### PATCH `/users/:id/role`

Admin only. Body: `{ "role": "admin" | "user" }`. Admins cannot change their own role.

## Activity Logs

### GET `/activity-logs`

Returns paginated activity entries with filters:

- `entityType`
- `entityId`
- `page`
- `limit`

## Socket Events

Client emits:

- `workflow:join`
- `workflow:leave`

Server emits:

- `workflow-created`
- `task-updated`
- `notification-created`
- `activity-added`

