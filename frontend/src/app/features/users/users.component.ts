import { Component, OnInit, inject } from "@angular/core";
import { User } from "../../core/models/auth.models";
import { AuthStateService } from "../../core/services/auth-state.service";
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
          <small *ngIf="isAdmin || user._id === currentUserId">{{ user.phone || 'No phone number added' }}</small>
        </div>
        <label class="auth-field compact-field" *ngIf="isAdmin && user._id !== currentUserId; else roleBadge">
          <span class="auth-label">Role</span>
          <select
            class="auth-input auth-select"
            [ngModel]="user.role"
            (ngModelChange)="changeRole(user, $event)"
            [disabled]="updatingIds.has(user._id)"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <ng-template #roleBadge>
          <div class="status-pill">{{ user.role | titlecase }}</div>
        </ng-template>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly authState = inject(AuthStateService);
  users: User[] = [];
  updatingIds = new Set<string>();

  get isAdmin() {
    return this.authState.user?.role === "admin";
  }

  get currentUserId() {
    return this.authState.user?._id;
  }

  ngOnInit() {
    this.load();
  }

  changeRole(user: User, role: User["role"]) {
    this.updatingIds.add(user._id);
    this.userDirectory.updateRole(user._id, role).subscribe({
      next: (updated) => {
        this.updatingIds.delete(user._id);
        this.users = this.users.map((item) => (item._id === updated._id ? { ...item, role: updated.role } : item));
      },
      error: () => {
        this.updatingIds.delete(user._id);
        this.load();
      }
    });
  }

  private load() {
    this.userDirectory.list().subscribe((users) => {
      this.users = users;
    });
  }
}
