import { Component, inject } from "@angular/core";
import { AuthService } from "../../core/services/auth.service";
import { AuthStateService } from "../../core/services/auth-state.service";

@Component({
  selector: "app-shell",
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-panel">
          <div class="brand">AI Workflow Cloud</div>
          <p class="brand-copy">Plan, assign, and monitor team workflows from one calm control center.</p>
        </div>

        <div class="user-badge surface-card" *ngIf="currentUser">
          <div class="user-avatar">{{ currentUser.name.charAt(0) }}</div>
          <div>
            <strong>{{ currentUser.name }}</strong>
            <div>{{ currentUser.role | titlecase }}</div>
          </div>
        </div>

        <nav class="nav-group">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
            <mat-icon>space_dashboard</mat-icon>
            <span>Dashboard</span>
          </a>
          <a routerLink="/workflows" routerLinkActive="active" class="nav-link">
            <mat-icon>account_tree</mat-icon>
            <span>Workflow Builder</span>
          </a>
          <a routerLink="/notifications" routerLinkActive="active" class="nav-link">
            <mat-icon>notifications</mat-icon>
            <span>Notifications</span>
          </a>
          <a routerLink="/activity" routerLinkActive="active" class="nav-link">
            <mat-icon>history</mat-icon>
            <span>Activity Logs</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-tip">
            <mat-icon>tips_and_updates</mat-icon>
            <span>Start by creating a workflow from a short natural-language prompt.</span>
          </div>
          <button mat-stroked-button color="accent" (click)="logout()">Logout</button>
        </div>
      </aside>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class ShellComponent {
  private readonly authState = inject(AuthStateService);
  currentUser = this.authState.user;

  constructor(private readonly authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}
