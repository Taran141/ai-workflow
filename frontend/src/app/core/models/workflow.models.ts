export interface Workflow {
  _id: string;
  title: string;
  description?: string;
  status: "draft" | "active" | "completed";
  createdBy?: string;
  participants?: string[];
  stages: Array<{ name: string; order: number }>;
  automationRules: Array<{ trigger: string; action: string }>;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  workflowId: string;
  createdBy?: string;
  stageName: string;
  assignedTo?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  deadline?: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type:
    | "WORKFLOW_CREATED"
    | "AI_WORKFLOW_GENERATED"
    | "WORKFLOW_STATUS_UPDATED"
    | "TASK_ASSIGNED"
    | "TASK_COMPLETED"
    | "SYSTEM";
  channel: "IN_APP" | "EMAIL" | "SMS";
  status: "PENDING" | "SENT" | "FAILED" | "READ" | "SKIPPED";
  isRead: boolean;
  createdAt: string;
}

export interface ActivityItem {
  _id: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: {
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    workflowId?: string;
    workflowTitle?: string;
    taskCreatorId?: string;
    taskTitle?: string;
    assignedTo?: string;
    assignedToName?: string;
    assignedToRole?: string;
    previousAssignedTo?: string;
    previousAssignedToName?: string;
    previousAssignedToRole?: string;
    status?: string;
    previousStatus?: string;
    prompt?: string;
  };
  createdAt: string;
}
