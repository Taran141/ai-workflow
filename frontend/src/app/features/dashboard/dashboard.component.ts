import { Component, OnInit, inject } from "@angular/core";
import { ActivityItem } from "../../core/models/workflow.models";
import { ActivityStoreService } from "../../core/services/activity-store.service";
import { NotificationStoreService } from "../../core/services/notification-store.service";
import { WorkflowStoreService } from "../../core/services/workflow-store.service";

@Component({
  selector: "app-dashboard",
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Realtime Workflow Command Center</h1>
        <p class="page-subtitle">Track what needs attention, what is moving well, and where the next action should happen.</p>
      </div>
      <div class="status-pill status-pill-strong"><span class="status-dot"></span> Live system connected</div>
    </div>

    <section class="grid grid-3">
      <div class="surface-card metric-card metric-card-highlight">
        <div class="metric-label">Active workflows</div>
        <h2>{{ (workflows$ | async)?.length || 0 }}</h2>
        <p>Workspaces currently visible to your account.</p>
      </div>
      <div class="surface-card metric-card">
        <div class="metric-label">Unread notifications</div>
        <h2>{{ unreadCount }}</h2>
        <p>Fresh updates waiting for review or acknowledgement.</p>
      </div>
      <div class="surface-card metric-card">
        <div class="metric-label">Live activity events</div>
        <h2>{{ (activities$ | async)?.length || 0 }}</h2>
        <p>Recent workflow and task activity captured in the log.</p>
      </div>
    </section>

    <section class="two-col-layout dashboard-layout">
      <div class="surface-card panel">
        <div class="panel-heading">
          <div>
            <h3>Recent Workflows</h3>
            <p>Open a workflow to inspect stages, automations, and downstream tasks.</p>
          </div>
        </div>
        <ng-container *ngIf="!(loading$ | async); else loadingState">
          <div class="empty-state" *ngIf="(workflows$ | async)?.length === 0">
            <mat-icon>account_tree</mat-icon>
            <strong>No workflows yet</strong>
            <p>Create your first workflow from the builder to populate this dashboard.</p>
          </div>
          <div class="workflow-row" *ngFor="let workflow of workflows$ | async">
            <div class="row-stack">
              <strong>{{ workflow.title }}</strong>
              <div>{{ workflow.description || 'AI-generated operational workflow' }}</div>
            </div>
            <div class="status-pill">{{ workflow.status }}</div>
          </div>
        </ng-container>
        <ng-template #loadingState>
          <app-loading-skeleton [height]="80"></app-loading-skeleton>
        </ng-template>
      </div>

      <div class="surface-card panel">
        <div class="panel-heading">
          <div>
            <h3>Live Activity Feed</h3>
            <p>Use this stream to confirm what changed and when it changed.</p>
          </div>
        </div>
        <div class="empty-state compact" *ngIf="(activities$ | async)?.length === 0">
          <mat-icon>history</mat-icon>
          <p>Activity will appear here once workflows and tasks start changing.</p>
        </div>
        <div class="timeline-item" *ngFor="let activity of activities$ | async">
          <strong>{{ describeActivity(activity) }}</strong>
          <div>{{ describeActivityContext(activity) }}</div>
          <small>{{ activity.createdAt | date: 'short' }}</small>
        </div>
      </div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  private readonly workflowStore = inject(WorkflowStoreService);
  private readonly notificationStore = inject(NotificationStoreService);
  private readonly activityStore = inject(ActivityStoreService);

  readonly workflows$ = this.workflowStore.workflows$;
  readonly loading$ = this.workflowStore.loading$;
  readonly activities$ = this.activityStore.activities$;
  unreadCount = 0;

  ngOnInit() {
    this.workflowStore.refresh();
    this.notificationStore.load();
    this.activityStore.load();
    this.notificationStore.notifications$.subscribe((items) => {
      this.unreadCount = items.filter((item) => !item.isRead).length;
    });
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
      if (previousAssignedTo) {
        return `Reassigned from ${previousAssignedTo} to ${assignedTo}`;
      }
      return `Assigned to ${assignedTo}`;
    }

    return activity.metadata?.workflowTitle
      ? `${activity.entityType} | ${activity.metadata.workflowTitle}`
      : activity.entityType;
  }
}
