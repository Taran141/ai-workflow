import { Component, OnInit, inject } from "@angular/core";
import { NotificationStoreService } from "../../core/services/notification-store.service";

@Component({
  selector: "app-notifications",
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-subtitle">Realtime alerts for assignments, completions, and AI workflow events.</p>
      </div>
    </div>

    <div class="surface-card panel">
      <div class="notification-item" *ngFor="let item of notifications$ | async">
        <strong>{{ item.title }}</strong>
        <div>{{ item.message }}</div>
        <div class="toolbar-actions" style="margin-top: 10px;">
          <span>{{ item.createdAt | date: 'short' }}</span>
          <button *ngIf="!item.read" mat-button color="primary" (click)="markAsRead(item._id)">Mark as read</button>
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
}
