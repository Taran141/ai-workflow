import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { Subject, forkJoin, takeUntil } from "rxjs";
import { User } from "../../core/models/auth.models";
import { Task, Workflow } from "../../core/models/workflow.models";
import { ApiService } from "../../core/services/api.service";
import { AuthStateService } from "../../core/services/auth-state.service";
import { SocketService } from "../../core/services/socket.service";
import { UserDirectoryService } from "../../core/services/user-directory.service";

@Component({
  selector: "app-workflow-details",
  template: `
    <div class="page-header" *ngIf="workflow">
      <div>
        <div class="eyebrow">Workflow operations</div>
        <h1 class="page-title">{{ workflow.title }}</h1>
        <p class="page-subtitle">{{ workflow.description || 'Structured workflow with live task orchestration.' }}</p>
      </div>
      <div class="workflow-header-actions">
        <label class="auth-field compact-field" *ngIf="canManageWorkflow">
          <span class="auth-label">Workflow status</span>
          <select
            class="auth-input auth-select"
            [ngModel]="workflow.status"
            (ngModelChange)="updateWorkflowStatus($event)"
            [ngModelOptions]="{ standalone: true }"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <div class="status-pill">{{ workflow.status }}</div>
      </div>
    </div>

    <section class="two-col-layout workflow-overview" *ngIf="workflow">
      <div class="surface-card panel">
        <div class="panel-heading">
          <div>
            <h3>Workflow Timeline</h3>
            <p>These stages shape how work moves from intake to completion.</p>
          </div>
        </div>
        <div class="timeline-item" *ngFor="let stage of workflow.stages">
          <strong>{{ stage.order }}. {{ stage.name }}</strong>
        </div>
      </div>

      <div class="surface-card panel">
        <div class="panel-heading">
          <div>
            <h3>Automation Rules</h3>
            <p>These are the AI-suggested follow-up actions tied to process triggers.</p>
          </div>
        </div>
        <div class="empty-state compact" *ngIf="workflow.automationRules.length === 0">
          <mat-icon>bolt</mat-icon>
          <p>No automation rules were defined for this workflow.</p>
        </div>
        <div class="timeline-item" *ngFor="let rule of workflow.automationRules">
          <strong>{{ rule.trigger }}</strong>
          <div>{{ rule.action }}</div>
        </div>
      </div>
    </section>

    <section class="surface-card panel task-operations-panel" *ngIf="workflow">
      <div class="panel-heading">
        <div>
          <h3>Task Operations</h3>
          <p>Assign owners, adjust priorities, and keep delivery moving without leaving the workflow.</p>
        </div>
        <div class="status-pill">{{ tasks.length }} tasks</div>
      </div>

      <form class="form-grid task-create-form" [formGroup]="taskForm" (ngSubmit)="createTask()">
        <div class="grid grid-2">
          <label class="auth-field">
            <span class="auth-label">Task title</span>
            <input class="auth-input" type="text" formControlName="title" placeholder="Prepare access checklist" />
          </label>

          <label class="auth-field">
            <span class="auth-label">Stage</span>
            <select class="auth-input auth-select" formControlName="stageName">
              <option *ngFor="let stage of workflow.stages" [value]="stage.name">{{ stage.name }}</option>
            </select>
          </label>
        </div>

        <label class="auth-field">
          <span class="auth-label">Description</span>
          <textarea
            class="auth-input workflow-textarea compact-textarea"
            rows="3"
            formControlName="description"
            placeholder="Explain the deliverable, context, or expected handoff."
          ></textarea>
        </label>

        <div class="grid grid-3">
          <label class="auth-field">
            <span class="auth-label">Assignee</span>
            <select class="auth-input auth-select" formControlName="assignedTo">
              <option value="">Unassigned</option>
              <option *ngFor="let user of users" [value]="user._id">{{ user.name }} · {{ user.role }}</option>
            </select>
          </label>

          <label class="auth-field">
            <span class="auth-label">Priority</span>
            <select class="auth-input auth-select" formControlName="priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label class="auth-field">
            <span class="auth-label">Deadline</span>
            <input class="auth-input" type="date" formControlName="deadline" />
          </label>
        </div>

        <div class="task-create-actions">
          <button type="submit" class="primary-action task-submit-button" [disabled]="taskForm.invalid || isCreatingTask">
            {{ isCreatingTask ? 'Creating task...' : 'Create task' }}
          </button>
        </div>
      </form>

      <div class="empty-state" *ngIf="tasks.length === 0">
        <mat-icon>assignment</mat-icon>
        <strong>No tasks yet</strong>
        <p>Create the first task above to make this workflow operational.</p>
      </div>

      <div class="task-card" *ngFor="let task of tasks">
        <div class="task-card-header">
          <div class="row-stack">
            <strong>{{ task.title }}</strong>
            <div>{{ task.description || 'No task description provided yet.' }}</div>
          </div>
          <div class="task-chip-group">
            <span class="status-pill">{{ task.status }}</span>
            <span class="status-pill">{{ task.priority }} priority</span>
          </div>
        </div>

        <div class="grid grid-2 task-edit-grid">
          <label class="auth-field">
            <span class="auth-label">Status</span>
            <select
              class="auth-input auth-select"
              [(ngModel)]="taskEdits[task._id].status"
              [ngModelOptions]="{ standalone: true }"
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>

          <label class="auth-field">
            <span class="auth-label">Priority</span>
            <select
              class="auth-input auth-select"
              [(ngModel)]="taskEdits[task._id].priority"
              [ngModelOptions]="{ standalone: true }"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label class="auth-field">
            <span class="auth-label">Assignee</span>
            <select
              class="auth-input auth-select"
              [(ngModel)]="taskEdits[task._id].assignedTo"
              [ngModelOptions]="{ standalone: true }"
            >
              <option value="">Unassigned</option>
              <option *ngFor="let user of users" [value]="user._id">{{ user.name }} · {{ user.role }}</option>
            </select>
          </label>

          <label class="auth-field">
            <span class="auth-label">Stage</span>
            <select
              class="auth-input auth-select"
              [(ngModel)]="taskEdits[task._id].stageName"
              [ngModelOptions]="{ standalone: true }"
            >
              <option *ngFor="let stage of workflow.stages" [value]="stage.name">{{ stage.name }}</option>
            </select>
          </label>

          <label class="auth-field">
            <span class="auth-label">Deadline</span>
            <input
              class="auth-input"
              type="date"
              [(ngModel)]="taskEdits[task._id].deadline"
              [ngModelOptions]="{ standalone: true }"
            />
          </label>

          <div class="task-meta-card">
            <div><strong>Owner:</strong> {{ resolveUserName(taskEdits[task._id].assignedTo) }}</div>
            <div><strong>Stage:</strong> {{ taskEdits[task._id].stageName }}</div>
            <div><strong>Due:</strong> {{ taskEdits[task._id].deadline ? (taskEdits[task._id].deadline | date: 'mediumDate') : 'No deadline' }}</div>
          </div>
        </div>

        <div class="toolbar-actions">
          <button class="primary-action task-save-button" type="button" (click)="saveTask(task)" [disabled]="savingTaskIds.has(task._id)">
            {{ savingTaskIds.has(task._id) ? 'Saving...' : 'Save changes' }}
          </button>
        </div>
      </div>
    </section>
  `
})
export class WorkflowDetailsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly socket = inject(SocketService);
  private readonly authState = inject(AuthStateService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly fb = inject(FormBuilder);

  workflow?: Workflow;
  tasks: Task[] = [];
  users: User[] = [];
  taskEdits: Record<string, { status: Task["status"]; priority: Task["priority"]; assignedTo: string; stageName: string; deadline: string }> = {};
  savingTaskIds = new Set<string>();
  isCreatingTask = false;

  readonly taskForm = this.fb.group({
    title: ["", [Validators.required, Validators.minLength(2)]],
    description: [""],
    assignedTo: [""],
    stageName: ["", [Validators.required]],
    priority: ["medium" as Task["priority"], [Validators.required]],
    deadline: [""]
  });

  get canManageWorkflow() {
    return this.authState.user?.role === "admin";
  }

  ngOnInit() {
    const workflowId = this.route.snapshot.paramMap.get("id")!;
    this.socket.joinWorkflow(workflowId);

    forkJoin({
      details: this.api.get<{ workflow: Workflow; tasks: Task[] }>(`/workflows/${workflowId}`),
      users: this.userDirectory.list()
    }).subscribe(({ details, users }) => {
      this.users = users;
      this.applyWorkflowResponse(details.workflow, details.tasks);
    });

    this.socket
      .on("task-updated")
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load(workflowId));

    this.socket
      .on("workflow-created")
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load(workflowId));
  }

  load(workflowId: string) {
    this.api.get<{ workflow: Workflow; tasks: Task[] }>(`/workflows/${workflowId}`).subscribe((response) => {
      this.applyWorkflowResponse(response.workflow, response.tasks);
    });
  }

  createTask() {
    if (!this.workflow || this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const workflowId = this.workflow._id;
    this.isCreatingTask = true;
    const raw = this.taskForm.getRawValue();
    this.api
      .post<Task>("/tasks", {
        workflowId,
        title: raw.title ?? "",
        description: raw.description ?? "",
        stageName: raw.stageName ?? this.workflow.stages[0]?.name ?? "Backlog",
        priority: raw.priority ?? "medium",
        ...(raw.assignedTo ? { assignedTo: raw.assignedTo } : {}),
        ...(raw.deadline ? { deadline: raw.deadline } : {})
      })
      .subscribe({
        next: () => {
          this.isCreatingTask = false;
          this.taskForm.reset({
            title: "",
            description: "",
            assignedTo: "",
            stageName: this.workflow?.stages[0]?.name ?? "",
            priority: "medium",
            deadline: ""
          });
          this.load(workflowId);
        },
        error: () => {
          this.isCreatingTask = false;
        }
      });
  }

  saveTask(task: Task) {
    const edit = this.taskEdits[task._id];
    if (!edit) {
      return;
    }

    const workflowId = this.workflow?._id;
    if (!workflowId) {
      return;
    }

    this.savingTaskIds.add(task._id);
    this.api
      .patch<Task>(`/tasks/${task._id}`, {
        status: edit.status,
        priority: edit.priority,
        stageName: edit.stageName,
        ...(edit.assignedTo ? { assignedTo: edit.assignedTo } : { assignedTo: undefined }),
        ...(edit.deadline ? { deadline: edit.deadline } : { deadline: undefined })
      })
      .subscribe({
        next: () => {
          this.savingTaskIds.delete(task._id);
          this.load(workflowId);
        },
        error: () => {
          this.savingTaskIds.delete(task._id);
        }
      });
  }

  updateWorkflowStatus(status: Workflow["status"]) {
    if (!this.workflow || !this.canManageWorkflow || status === this.workflow.status) {
      return;
    }

    this.api.patch<Workflow>(`/workflows/${this.workflow._id}`, { status }).subscribe((workflow) => {
      this.workflow = workflow;
    });
  }

  resolveUserName(userId?: string) {
    if (!userId) {
      return "Unassigned";
    }

    return this.users.find((user) => user._id === userId)?.name ?? "Unknown user";
  }

  ngOnDestroy() {
    const workflowId = this.route.snapshot.paramMap.get("id");
    if (workflowId) {
      this.socket.leaveWorkflow(workflowId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyWorkflowResponse(workflow: Workflow, tasks: Task[]) {
    this.workflow = workflow;
    this.tasks = tasks;
    this.taskEdits = tasks.reduce<
      Record<string, { status: Task["status"]; priority: Task["priority"]; assignedTo: string; stageName: string; deadline: string }>
    >((accumulator, task) => {
      accumulator[task._id] = {
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo ?? "",
        stageName: task.stageName,
        deadline: task.deadline ? task.deadline.slice(0, 10) : ""
      };
      return accumulator;
    }, {});

    if (!this.taskForm.value.stageName) {
      this.taskForm.patchValue({ stageName: workflow.stages[0]?.name ?? "" });
    }
  }
}
