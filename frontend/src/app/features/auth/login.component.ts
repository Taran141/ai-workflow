import { Component, inject } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { finalize } from "rxjs";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  template: `
    <div class="auth-shell">
      <div class="auth-layout">
        <section class="hero-banner surface-card auth-story">
          <div class="auth-story-glow" aria-hidden="true"></div>
          <div class="eyebrow">AI Workflow Cloud</div>
          <h1>Run complex work without making people fight the software.</h1>
          <p>
            Create workflows in plain language, track tasks in real time, and keep every handoff visible for your
            team.
          </p>
          <div class="auth-highlights">
            <div class="auth-highlight">
              <mat-icon>bolt</mat-icon>
              <span>Generate workflows from a prompt</span>
            </div>
            <div class="auth-highlight">
              <mat-icon>groups</mat-icon>
              <span>Coordinate owners, stages, and deadlines</span>
            </div>
            <div class="auth-highlight">
              <mat-icon>shield</mat-icon>
              <span>Keep an audit trail of key activity</span>
            </div>
          </div>
        </section>

        <section class="surface-card auth-card auth-form-card">
          <div class="auth-form-header">
            <div class="eyebrow">Welcome back</div>
            <h2>Sign in to your workspace</h2>
            <p>Use the email and password you registered with to continue.</p>
          </div>

          <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
            <label class="auth-field" [class.has-error]="showError('email', 'required') || showError('email', 'email')">
              <span class="auth-label">Email</span>
              <input class="auth-input" type="email" formControlName="email" placeholder="name@company.com" />
              <span class="auth-help auth-help-error" *ngIf="showError('email', 'required')">Email is required.</span>
              <span class="auth-help auth-help-error" *ngIf="showError('email', 'email')">Enter a valid email address.</span>
            </label>
            <label class="auth-field" [class.has-error]="showError('password', 'required')">
              <span class="auth-label">Password</span>
              <input class="auth-input" type="password" formControlName="password" placeholder="Enter your password" />
              <span class="auth-help auth-help-error" *ngIf="showError('password', 'required')">Password is required.</span>
            </label>
            <div class="form-error" *ngIf="submitError">{{ submitError }}</div>
            <div class="auth-actions">
              <button type="submit" class="primary-action" [disabled]="isSubmitting || form.invalid">
                {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
              </button>
              <a routerLink="/auth/register" class="auth-switch">Create an account</a>
            </div>
          </form>
        </section>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  isSubmitting = false;
  submitError = "";

  readonly form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required]]
  });

  showError(controlName: "email" | "password", errorCode: string) {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.hasError(errorCode);
  }

  submit() {
    this.submitError = "";
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.authService
      .login(this.form.getRawValue() as { email: string; password: string })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigateByUrl("/dashboard"),
        error: (error: HttpErrorResponse) => {
          this.submitError = error.error?.message ?? "Login failed. Please verify your email and password.";
        }
      });
  }
}
