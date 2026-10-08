import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { finalize } from "rxjs";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-register",
  template: `
    <div class="auth-shell">
      <div class="auth-layout">
        <section class="hero-banner surface-card auth-story">
          <div class="auth-story-glow" aria-hidden="true"></div>
          <div class="eyebrow">Set up your workspace</div>
          <h1>Start with one account, then invite the rest of the team.</h1>
          <p>
            Generate workflows, assign work, monitor live progress, and review activity in one place. The first account
            becomes the workspace admin; admins can promote teammates from the People page.
          </p>
          <div class="auth-highlights">
            <div class="auth-highlight">
              <mat-icon>auto_awesome</mat-icon>
              <span>Turn prompts into structured workflows</span>
            </div>
            <div class="auth-highlight">
              <mat-icon>assignment_turned_in</mat-icon>
              <span>Track tasks from backlog to completion</span>
            </div>
            <div class="auth-highlight">
              <mat-icon>notifications_active</mat-icon>
              <span>Keep everyone updated with live notifications</span>
            </div>
          </div>
        </section>

        <section class="surface-card auth-card auth-form-card">
          <div class="auth-form-header">
            <div class="eyebrow">Create account</div>
            <h2>Create your workspace account</h2>
            <p>Choose a strong password and add your phone number if you want SMS updates.</p>
          </div>

          <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
            <label class="auth-field" [class.has-error]="showError('name', 'required') || showError('name', 'minlength')">
              <span class="auth-label">Name</span>
              <input class="auth-input" type="text" formControlName="name" placeholder="Taran Sharma" />
              <span class="auth-help auth-help-error" *ngIf="showError('name', 'required')">Name is required.</span>
              <span class="auth-help auth-help-error" *ngIf="showError('name', 'minlength')">Name must be at least 2 characters.</span>
            </label>

            <label class="auth-field" [class.has-error]="showError('email', 'required') || showError('email', 'email')">
              <span class="auth-label">Email</span>
              <input class="auth-input" type="email" formControlName="email" placeholder="name@company.com" />
              <span class="auth-help auth-help-error" *ngIf="showError('email', 'required')">Email is required.</span>
              <span class="auth-help auth-help-error" *ngIf="showError('email', 'email')">Enter a valid email address.</span>
            </label>

            <label class="auth-field" [class.has-error]="showError('phone', 'pattern')">
              <span class="auth-label">Phone Number</span>
              <input class="auth-input" type="tel" formControlName="phone" placeholder="+91 9876543210" />
              <span class="auth-help">Optional, but needed if you want SMS notifications.</span>
              <span class="auth-help auth-help-error" *ngIf="showError('phone', 'pattern')">Enter a valid phone number.</span>
            </label>

            <label class="auth-field" [class.has-error]="showError('password', 'required') || showError('password', 'minlength') || showError('password', 'pattern')">
              <span class="auth-label">Password</span>
              <input class="auth-input" type="password" formControlName="password" placeholder="Create a strong password" />
              <span class="auth-help">Use 8+ characters with uppercase, lowercase, and a number.</span>
              <span class="auth-help auth-help-error" *ngIf="showError('password', 'required')">Password is required.</span>
              <span class="auth-help auth-help-error" *ngIf="showError('password', 'minlength')">Password must be at least 8 characters.</span>
              <span class="auth-help auth-help-error" *ngIf="showError('password', 'pattern')">
                Password must include uppercase, lowercase, and a number.
              </span>
            </label>

            <div class="form-error" *ngIf="submitError">{{ submitError }}</div>

            <div class="auth-actions">
              <button type="submit" class="primary-action" [disabled]="isSubmitting || form.invalid">
                {{ isSubmitting ? 'Registering...' : 'Create account' }}
              </button>
              <a routerLink="/auth/login" class="auth-switch">Already have an account? Sign in</a>
            </div>
          </form>
        </section>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private static readonly passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).+$/;
  private static readonly phonePattern = /^[0-9+\-\s()]{10,20}$/;
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  isSubmitting = false;
  submitError = "";

  readonly form = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    email: ["", [Validators.required, Validators.email]],
    phone: ["", [Validators.pattern(RegisterComponent.phonePattern)]],
    password: [
      "",
      [Validators.required, Validators.minLength(8), Validators.pattern(RegisterComponent.passwordPattern)]
    ]
  });

  showError(controlName: "name" | "email" | "phone" | "password", errorCode: string) {
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
    const { name, email, phone, password } = this.form.getRawValue();

    this.authService
      .register({
        name: name ?? "",
        email: email ?? "",
        password: password ?? "",
        ...(phone?.trim() ? { phone: phone.trim() } : {})
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigateByUrl("/dashboard"),
        error: (error: HttpErrorResponse) => {
          this.submitError = error.error?.message ?? "Registration failed. Please check your details and try again.";
        }
      });
  }
}
