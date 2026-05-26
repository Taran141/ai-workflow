import { Component, OnInit, inject } from "@angular/core";
import { ActivityItem } from "../../core/models/workflow.models";
import { ActivityStoreService } from "../../core/services/activity-store.service";

@Component({
  selector: "app-activity",
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Activity Logs</h1>
        <p class="page-subtitle">Immutable audit view for workflow creation, task changes, and automation signals.</p>
      </div>
    </div>

    <div class="surface-card panel">
      <div class="timeline-item" *ngFor="let item of activities$ | async">
        <strong>{{ describeActivity(item) }}</strong>
        <div>{{ describeActivityContext(item) }}</div>
        <small>{{ item.createdAt | date: 'medium' }}</small>
      </div>
    </div>
  `
})
export class ActivityComponent implements OnInit {
  private readonly activityStore = inject(ActivityStoreService);
  readonly activities$ = this.activityStore.activities$;

  ngOnInit() {
    this.activityStore.load();
  }

  describeActivity(activity: ActivityItem) {
    const actor = activity.metadata?.actorName ?? "Someone";
    const actorRole = activity.metadata?.actorRole ? ` (${activity.metadata.actorRole})` : "";
    const workflowTitle = activity.metadata?.workflowTitle ?? "workflow";
    const taskTitle = activity.metadata?.taskTitle ?? "task";
    const assignee = activity.metadata?.assignedToName ?? "someone";

    switch (activity.action) {
      case "WORKFLOW_CREATED":
        return `${actor}${actorRole} created workflow "${workflowTitle}"`;
      case "AI_WORKFLOW_GENERATED":
        return `${actor}${actorRole} generated workflow "${workflowTitle}" with AI`;
      case "WORKFLOW_STATUS_UPDATED":
        return `${actor}${actorRole} updated workflow "${workflowTitle}"`;
      case "TASK_CREATED":
        return `${actor}${actorRole} created task "${taskTitle}"`;
      case "TASK_ASSIGNED":
        return `${actor}${actorRole} assigned task "${taskTitle}" to ${assignee}`;
      case "TASK_COMPLETED":
        return `${actor}${actorRole} completed task "${taskTitle}"`;
      default:
        return activity.action;
    }
  }

  describeActivityContext(activity: ActivityItem) {
    if (activity.action === "WORKFLOW_STATUS_UPDATED") {
      const previousStatus = activity.metadata?.previousStatus ?? "unknown";
      const status = activity.metadata?.status ?? "unknown";
      return `${previousStatus} to ${status}`;
    }

    if (activity.action === "TASK_CREATED" && activity.metadata?.assignedToName) {
      const assignedRole = activity.metadata.assignedToRole ? ` (${activity.metadata.assignedToRole})` : "";
      return `Assigned to ${activity.metadata.assignedToName}${assignedRole}`;
    }

    if (activity.action === "TASK_ASSIGNED") {
      const assignedTo = activity.metadata?.assignedToName ?? "someone";
      const previousAssignedTo = activity.metadata?.previousAssignedToName;
      const base = previousAssignedTo ? `Reassigned from ${previousAssignedTo} to ${assignedTo}` : `Assigned to ${assignedTo}`;
      return activity.metadata?.workflowTitle ? `${base} in "${activity.metadata.workflowTitle}"` : base;
    }

    return activity.metadata?.workflowTitle
      ? `${activity.entityType} / ${activity.metadata.workflowTitle}`
      : `${activity.entityType} / ${activity.entityId}`;
  }
}
