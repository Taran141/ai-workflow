import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
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
        <p class="page-subtitle">Describe, shape, and maintain the workflows your team actually runs.</p>
      </div>
    </div>

    <div class="surface-card panel workflow-builder-panel">
      <div class="grid grid-2">
        <form class="form-grid" [formGroup]="promptForm" (ngSubmit)="generate()">
          <div class="panel-heading">
            <div class="workflow-builder-copy">
              <h3>Generate with AI</h3>
              <p>Start from a prompt when you want a strong first draft with stages, tasks, and automation ideas.</p>
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
          <div class="workflow-builder-actions workflow-builder-actions-single">
            <button type="submit" class="primary-action workflow-generate-button">Generate Workflow</button>
          </div>
        </form>

        <form class="form-grid" [formGroup]="manualForm" (ngSubmit)="createManual()">
          <div class="panel-heading">
            <div class="workflow-builder-copy">
              <h3>Create manually</h3>
              <p>Use this when you already know the process and want a fast, clean workflow without AI.</p>
            </div>
          </div>
          <label class="auth-field">
            <span class="auth-label">Title</span>
            <input class="auth-input" type="text" formControlName="title" placeholder="Client onboarding checklist" />
          </label>
          <label class="auth-field">
            <span class="auth-label">Description</span>
            <textarea
              class="auth-input workflow-textarea compact-textarea"
              rows="3"
              formControlName="description"
              placeholder="Outline the process, expected handoffs, and what this workflow supports."
            ></textarea>
          </label>
          <label class="auth-field">
            <span class="auth-label">Stages</span>
            <textarea
              class="auth-input workflow-textarea compact-textarea"
              rows="4"
              formControlName="stages"
              placeholder="Backlog&#10;In Progress&#10;Review&#10;Done"
            ></textarea>
          </label>
          <div class="workflow-builder-actions workflow-builder-actions-single">
            <button type="submit" class="primary-action workflow-generate-button" [disabled]="manualForm.invalid || isCreatingManual">
              {{ isCreatingManual ? 'Creating workflow...' : 'Create Manual Workflow' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="surface-card panel">
      <div class="panel-heading">
        <div>
          <h3>Workflow library</h3>
          <p>Search, filter, sort, and open any workflow without losing context.</p>
        </div>
      </div>

      <div class="toolbar-actions workflow-filter-bar">
        <label class="auth-field search-input workflow-search-field">
          <span class="auth-label">Search workflows</span>
          <input class="auth-input" type="text" placeholder="Search by title or use case" (input)="onSearch($any($event.target).value)" />
        </label>
        <label class="auth-field compact-field">
          <span class="auth-label">Status</span>
          <select class="auth-input auth-select" (change)="onStatusChange($any($event.target).value)">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label class="auth-field compact-field">
          <span class="auth-label">Sort</span>
          <select class="auth-input auth-select" (change)="onSortChange($any($event.target).value)">
            <option value="createdAt:desc">Newest first</option>
            <option value="createdAt:asc">Oldest first</option>
            <option value="title:asc">Title A-Z</option>
            <option value="title:desc">Title Z-A</option>
          </select>
        </label>
      </div>

      <div class="empty-state" *ngIf="(workflows$ | async)?.length === 0">
        <mat-icon>auto_awesome_motion</mat-icon>
        <strong>No workflows yet</strong>
        <p>Create one manually or generate one from the AI prompt box above.</p>
      </div>

      <div class="workflow-row workflow-card-row" *ngFor="let workflow of workflows$ | async" (click)="openDetails(workflow)">
        <div class="row-stack">
          <strong>{{ workflow.title }}</strong>
          <div>{{ workflow.description || 'Operational workflow ready for execution.' }}</div>
          <small>{{ workflow.stages.length }} stages | {{ workflow.automationRules.length }} automations</small>
        </div>
        <div class="toolbar-actions">
          <div class="status-pill">{{ workflow.status }}</div>
          <button
            type="button"
            mat-stroked-button
            color="warn"
            (click)="deleteWorkflow(workflow, $event)"
            [disabled]="workflow._id.startsWith('temp-') || deletingIds.has(workflow._id)"
          >
            {{ deletingIds.has(workflow._id) ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
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
    prompt: ["Create employee onboarding workflow", [Validators.required, Validators.minLength(10)]]
  });
  readonly manualForm = this.fb.group({
    title: ["", [Validators.required, Validators.minLength(2)]],
    description: [""],
    stages: ["Backlog\nIn Progress\nReview\nDone", [Validators.required]]
  });
  deletingIds = new Set<string>();
  isCreatingManual = false;

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

  createManual() {
    if (this.manualForm.invalid) {
      this.manualForm.markAllAsTouched();
      return;
    }

    this.isCreatingManual = true;
    const raw = this.manualForm.getRawValue();
    const stages = (raw.stages ?? "")
      .split(/\r?\n/)
      .map((stage) => stage.trim())
      .filter(Boolean)
      .map((name, index) => ({ name, order: index + 1 }));

    this.api
      .post<Workflow>("/workflows", {
        title: raw.title ?? "",
        description: raw.description ?? "",
        stages
      })
      .pipe(finalize(() => (this.isCreatingManual = false)))
      .subscribe({
        next: () => {
          this.manualForm.reset({
            title: "",
            description: "",
            stages: "Backlog\nIn Progress\nReview\nDone"
          });
          this.workflowStore.refresh();
        }
      });
  }

  onSearch(value: string) {
    this.workflowStore.setSearch(value);
  }

  onStatusChange(status: string) {
    this.workflowStore.setStatus(status || undefined);
  }

  onSortChange(value: string) {
    const [sortBy, sortOrder] = value.split(":") as [string, "asc" | "desc"];
    this.workflowStore.setSort(sortBy, sortOrder);
  }

  openDetails(workflow: Workflow) {
    if (!workflow._id.startsWith("temp-")) {
      this.router.navigate(["/workflows", workflow._id]);
    }
  }

  deleteWorkflow(workflow: Workflow, event: Event) {
    event.stopPropagation();
    if (workflow._id.startsWith("temp-")) {
      return;
    }

    this.deletingIds.add(workflow._id);
    this.api.delete<void>(`/workflows/${workflow._id}`).pipe(finalize(() => this.deletingIds.delete(workflow._id))).subscribe({
      next: () => this.workflowStore.refresh()
    });
  }
}
