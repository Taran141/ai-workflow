export interface Workflow {
  _id: string;
  title: string;
  description?: string;
  status: "draft" | "active" | "completed";
  stages: Array<{ name: string; order: number }>;
  automationRules: Array<{ trigger: string; action: string }>;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  workflowId: string;
  stageName: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  deadline?: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: "workflow" | "task" | "system";
  read: boolean;
  createdAt: string;
}

export interface ActivityItem {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

