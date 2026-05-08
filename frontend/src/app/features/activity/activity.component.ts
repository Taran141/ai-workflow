import { Component, OnInit, inject } from "@angular/core";
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
        <strong>{{ item.action }}</strong>
        <div>{{ item.entityType }} / {{ item.entityId }}</div>
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
}
