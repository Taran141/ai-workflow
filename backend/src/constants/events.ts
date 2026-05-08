export const DomainEvents = {
  WORKFLOW_CREATED: "WORKFLOW_CREATED",
  AI_WORKFLOW_GENERATED: "AI_WORKFLOW_GENERATED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_UPDATED: "TASK_UPDATED",
  NOTIFICATION_CREATED: "NOTIFICATION_CREATED",
  ACTIVITY_ADDED: "ACTIVITY_ADDED"
} as const;

export const SocketEvents = {
  WORKFLOW_CREATED: "workflow-created",
  TASK_UPDATED: "task-updated",
  NOTIFICATION_CREATED: "notification-created",
  ACTIVITY_ADDED: "activity-added",
  WORKFLOW_JOIN: "workflow:join",
  WORKFLOW_LEAVE: "workflow:leave"
} as const;

