import { Component, OnInit, inject } from "@angular/core";
import { User } from "../../core/models/auth.models";
import { UserDirectoryService } from "../../core/services/user-directory.service";

@Component({
  selector: "app-users",
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">People Directory</h1>
        <p class="page-subtitle">See who is in the workspace so task assignment feels fast and confident.</p>
      </div>
    </div>

    <div class="surface-card panel">
      <div class="panel-heading">
        <div>
          <h3>Workspace members</h3>
          <p>Use this directory when choosing collaborators, assignees, and workflow participants.</p>
        </div>
        <div class="status-pill">{{ users.length }} members</div>
      </div>

      <div class="empty-state" *ngIf="users.length === 0">
        <mat-icon>group</mat-icon>
        <strong>No users found</strong>
        <p>Once people register, they will show up here for assignment and collaboration.</p>
      </div>

      <div class="workflow-row" *ngFor="let user of users">
        <div class="row-stack">
          <strong>{{ user.name }}</strong>
          <div>{{ user.email }}</div>
          <small>{{ user.phone || 'No phone number added' }}</small>
        </div>
        <div class="status-pill">{{ user.role | titlecase }}</div>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  private readonly userDirectory = inject(UserDirectoryService);
  users: User[] = [];

  ngOnInit() {
    this.userDirectory.list().subscribe((users) => {
      this.users = users;
    });
  }
}
