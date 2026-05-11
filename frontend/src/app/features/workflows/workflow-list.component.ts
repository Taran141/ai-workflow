import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { Router } from "@angular/router";
import { finalize } from "rxjs";
import { ApiService } from "../../core/services/api.service";
import { WorkflowStoreService } from "../../core/services/workflow-store.service";
import { Workflow } from "../../core/models/workflow.models";

@Component({
  selector: "app-workflow-list",
  template: `
    <div class="page-header">
      <div class="workflow-page-intro">
        <div class="eyebrow">Workflow studio</div>
        <h1 class="page-title">Workflow Builder</h1>
        <p class="page-subtitle">Describe the process in plain language and turn it into something your team can run.</p>
      </div>
    </div>

    <div class="surface-card panel workflow-builder-panel">
      <form class="form-grid" [formGroup]="promptForm" (ngSubmit)="generate()">
        <div class="panel-heading">
          <div class="workflow-builder-copy">
            <h3>Generate a workflow</h3>
            <p>Try prompts like "client onboarding with approvals and reminders" or "bug triage for urgent issues."</p>
          </div>
        </div>
        <label class="auth-field workflow-prompt-field">
          <span class="auth-label">AI Prompt</span>
          <textarea
            class="auth-input workflow-textarea"
            rows="5"
            formControlName="prompt"
            placeholder="Create employee onboarding workflow with document collection, manager approval, IT setup, and first-week check-ins"
          ></textarea>
        </label>
        <div class="workflow-builder-actions">
          <button type="submit" class="primary-action workflow-generate-button">Generate Workflow</button>
          <label class="auth-field search-input workflow-search-field">
            <span class="auth-label">Search workflows</span>
            <input class="auth-input" type="text" placeholder="Search by title or use case" (input)="onSearch($any($event.target).value)" />
          </label>
        </div>
      </form>
    </div>

    <div class="surface-card panel">
      <div class="panel-heading">
        <div>
          <h3>Workflow library</h3>
          <p>Browse everything already created and open any finished workflow for details.</p>
        </div>
      </div>

      <div class="empty-state" *ngIf="(workflows$ | async)?.length === 0">
        <mat-icon>auto_awesome_motion</mat-icon>
        <strong>No workflows yet</strong>
        <p>Generate one from the prompt box above and it will appear here instantly.</p>
      </div>

      <div class="workflow-row workflow-card-row" *ngFor="let workflow of workflows$ | async" (click)="openDetails(workflow)">
        <div class="row-stack">
          <strong>{{ workflow.title }}</strong>
          <div>{{ workflow.description || 'AI-generated operational workflow' }}</div>
          <small>{{ workflow.stages.length }} stages • {{ workflow.automationRules.length }} automations</small>
        </div>
        <div class="status-pill">{{ workflow.status }}</div>
      </div>
    </div>
  `
})
export class WorkflowListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly workflowStore = inject(WorkflowStoreService);
  private readonly router = inject(Router);

  readonly workflows$ = this.workflowStore.workflows$;
  readonly promptForm = this.fb.group({
    prompt: ["Create employee onboarding workflow"]
  });

  ngOnInit() {
    this.workflowStore.refresh();
  }

  generate() {
    const prompt = this.promptForm.getRawValue().prompt ?? "";
    const optimisticWorkflow: Workflow = {
      _id: `temp-${Date.now()}`,
      title: "Generating workflow...",
      description: prompt,
      status: "draft",
      stages: [],
      automationRules: [],
      createdAt: new Date().toISOString()
    };

    this.workflowStore.addOptimistic(optimisticWorkflow);
    this.api
      .post<Workflow>("/workflows/generate", { prompt })
      .pipe(finalize(() => this.workflowStore.refresh()))
      .subscribe();
  }

  onSearch(value: string) {
    this.workflowStore.setSearch(value);
  }

  openDetails(workflow: Workflow) {
    if (!workflow._id.startsWith("temp-")) {
      this.router.navigate(["/workflows", workflow._id]);
    }
  }
}
