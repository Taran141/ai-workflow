import { Component, OnInit, inject } from "@angular/core";
import { NotificationItem } from "../../core/models/workflow.models";
import { NotificationStoreService } from "../../core/services/notification-store.service";

@Component({
  selector: "app-notifications",
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-subtitle">Review in-app, email, and SMS delivery events with a little more control.</p>
      </div>
    </div>

    <div class="surface-card panel">
      <div class="panel-heading">
        <div>
          <h3>Inbox</h3>
          <p>Filter by channel, delivery status, or read state so the list stays manageable.</p>
        </div>
      </div>

      <div class="toolbar-actions workflow-filter-bar">
        <label class="auth-field compact-field">
          <span class="auth-label">Channel</span>
          <select class="auth-input auth-select" (change)="applyChannel($any($event.target).value)">
            <option value="">All</option>
            <option value="IN_APP">In-app</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </label>
        <label class="auth-field compact-field">
          <span class="auth-label">Status</span>
          <select class="auth-input auth-select" (change)="applyStatus($any($event.target).value)">
            <option value="">All</option>
            <option value="SENT">Sent</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="READ">Read</option>
            <option value="SKIPPED">Skipped</option>
          </select>
        </label>
        <label class="auth-field compact-field">
          <span class="auth-label">Read state</span>
          <select class="auth-input auth-select" (change)="applyReadState($any($event.target).value)">
            <option value="">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
      </div>

      <div class="empty-state" *ngIf="(notifications$ | async)?.length === 0">
        <mat-icon>notifications_none</mat-icon>
        <strong>No notifications match this view</strong>
        <p>Try clearing a filter or wait for the next live event to arrive.</p>
      </div>

      <div class="notification-item" *ngFor="let item of notifications$ | async">
        <strong>{{ item.title }}</strong>
        <div>{{ item.message }}</div>
        <div class="toolbar-actions notification-meta-row" style="margin-top: 10px;">
          <span class="status-pill">{{ item.channel }}</span>
          <span class="status-pill">{{ item.status }}</span>
          <span>{{ item.createdAt | date: 'short' }}</span>
          <button *ngIf="!item.isRead" mat-button color="primary" (click)="markAsRead(item._id)">Mark as read</button>
          <button mat-button color="warn" (click)="delete(item._id)">Delete</button>
        </div>
      </div>
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  private readonly notificationStore = inject(NotificationStoreService);
  readonly notifications$ = this.notificationStore.notifications$;

  ngOnInit() {
    this.notificationStore.load();
  }

  markAsRead(id: string) {
    this.notificationStore.markAsRead(id);
  }

  delete(id: string) {
    this.notificationStore.delete(id);
  }

  applyChannel(channel: string) {
    this.notificationStore.load({ channel: (channel || undefined) as NotificationItem["channel"] | undefined });
  }

  applyStatus(status: string) {
    this.notificationStore.load({ status: (status || undefined) as NotificationItem["status"] | undefined });
  }

  applyReadState(value: string) {
    this.notificationStore.load({
      isRead: value ? value === "read" : undefined
    });
  }
}
