import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, forkJoin, takeUntil } from "rxjs";
import { User } from "../../core/models/auth.models";
import { ActivityItem, Task, TaskComment, Workflow } from "../../core/models/workflow.models";
import { ApiService } from "../../core/services/api.service";
import { AuthStateService } from "../../core/services/auth-state.service";
import { SocketService } from "../../core/services/socket.service";
import { UserDirectoryService } from "../../core/services/user-directory.service";

interface TaskCommentsResponse {
  items: TaskComment[];
}

interface ActivityResponse {
  items: ActivityItem[];
}

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

      <div class="task-conversation-layout" *ngIf="tasks.length > 0">
        <div class="task-list-column">
          <div class="task-card task-card-interactive" *ngFor="let task of tasks" [class.task-card-active]="selectedTask?._id === task._id">
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
              <button type="button" mat-stroked-button color="primary" (click)="openConversation(task)">
                {{ selectedTask?._id === task._id ? 'Viewing chat' : 'Open chat' }}
              </button>
            </div>
          </div>
        </div>

        <aside class="surface-card task-chat-panel" *ngIf="selectedTask; else selectTaskState">
          <div class="panel-heading">
            <div>
              <h3>{{ selectedTask.title }}</h3>
              <p>{{ selectedTask.description || 'Discuss blockers, updates, and decisions for this task here.' }}</p>
            </div>
            <button type="button" mat-button (click)="closeConversation()">Close</button>
          </div>

          <div class="task-chat-meta">
            <span class="status-pill">{{ selectedTask.status }}</span>
            <span class="status-pill">{{ resolveUserName(taskEdits[selectedTask._id]?.assignedTo) }}</span>
          </div>

          <div class="task-meta-card">
            <div><strong>Created by:</strong> {{ taskCreatorName }}</div>
            <div><strong>Assigned to:</strong> {{ selectedTask ? resolveUserName(taskEdits[selectedTask._id]?.assignedTo) : 'Unassigned' }}</div>
            <div *ngIf="latestAssignmentSummary"><strong>Latest assignment:</strong> {{ latestAssignmentSummary }}</div>
          </div>

          <div class="task-chat-thread" *ngIf="!commentsLoading; else commentsLoadingState">
            <div class="empty-state compact" *ngIf="selectedTaskComments.length === 0">
              <mat-icon>forum</mat-icon>
              <p>No conversation yet. Add the first update for this task.</p>
            </div>

            <div class="task-comment-item" *ngFor="let comment of selectedTaskComments">
              <div class="task-comment-avatar">{{ comment.authorName.charAt(0) }}</div>
              <div class="task-comment-body">
                <div class="task-comment-meta">
                  <strong>{{ comment.authorName }}</strong>
                  <span>{{ comment.authorRole || 'user' }}</span>
                  <small>{{ comment.createdAt | date: 'short' }}</small>
                </div>
                <div>{{ comment.message }}</div>
              </div>
            </div>
          </div>

          <ng-template #commentsLoadingState>
            <app-loading-skeleton [height]="120"></app-loading-skeleton>
          </ng-template>

          <form class="form-grid task-comment-form" [formGroup]="commentForm" (ngSubmit)="postComment()">
            <label class="auth-field">
              <span class="auth-label">Comment</span>
              <textarea
                class="auth-input workflow-textarea compact-textarea"
                rows="4"
                formControlName="message"
                placeholder="Share context, an update, a blocker, or the next action."
              ></textarea>
            </label>
            <div class="toolbar-actions">
              <button type="submit" class="primary-action task-submit-button" [disabled]="commentForm.invalid || isPostingComment">
                {{ isPostingComment ? 'Posting...' : 'Post comment' }}
              </button>
            </div>
          </form>
        </aside>

        <ng-template #selectTaskState>
          <aside class="surface-card task-chat-panel task-chat-panel-empty">
            <div class="empty-state">
              <mat-icon>chat</mat-icon>
              <strong>Open a task conversation</strong>
              <p>Select any task to discuss updates, blockers, and decisions in one place.</p>
            </div>
          </aside>
        </ng-template>
      </div>
    </section>
  `
})
export class WorkflowDetailsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly socket = inject(SocketService);
  private readonly authState = inject(AuthStateService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly fb = inject(FormBuilder);

  workflow?: Workflow;
  tasks: Task[] = [];
  users: User[] = [];
  selectedTask?: Task;
  selectedTaskComments: TaskComment[] = [];
  selectedTaskActivities: ActivityItem[] = [];
  commentsLoading = false;
  activityLoading = false;
  isPostingComment = false;
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
  readonly commentForm = this.fb.group({
    message: ["", [Validators.required, Validators.minLength(1)]]
  });

  get canManageWorkflow() {
    const user = this.authState.user;
    return user?.role === "admin" || (!!user && this.workflow?.createdBy === user._id);
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

    this.socket
      .on<{ workflowId: string }>("workflow-deleted")
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event.workflowId === workflowId) {
          this.router.navigateByUrl("/workflows");
        }
      });

    this.socket
      .on<TaskComment>("task-comment-added")
      .pipe(takeUntil(this.destroy$))
      .subscribe((comment) => {
        if (this.selectedTask?._id === comment.taskId) {
          this.selectedTaskComments = [...this.selectedTaskComments, comment];
        }
      });
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
        // null (not undefined, which JSON drops) so that unassigning or clearing the deadline is actually saved.
        assignedTo: edit.assignedTo || null,
        deadline: edit.deadline || null
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

  openConversation(task: Task) {
    this.selectedTask = task;
    this.commentForm.reset({ message: "" });
    this.loadComments(task._id);
    this.loadTaskActivity(task._id);
  }

  closeConversation() {
    this.selectedTask = undefined;
    this.selectedTaskComments = [];
    this.selectedTaskActivities = [];
    this.commentForm.reset({ message: "" });
  }

  postComment() {
    if (!this.selectedTask || this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isPostingComment = true;
    this.api
      .post<TaskComment>(`/tasks/${this.selectedTask._id}/comments`, {
        message: this.commentForm.getRawValue().message ?? ""
      })
      .subscribe({
        next: () => {
          this.isPostingComment = false;
          this.commentForm.reset({ message: "" });
        },
        error: () => {
          this.isPostingComment = false;
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

  get taskCreatorName() {
    if (!this.selectedTask?.createdBy) {
      return "AI system";
    }

    return this.resolveUserName(this.selectedTask.createdBy);
  }

  get latestAssignmentSummary() {
    const latestAssignment = this.selectedTaskActivities.find((activity) => activity.action === "TASK_ASSIGNED");
    if (!latestAssignment) {
      return "";
    }

    const actor = latestAssignment.metadata?.actorName ?? "Unknown user";
    const assignee = latestAssignment.metadata?.assignedToName ?? "Unknown user";
    return `${actor} assigned this task to ${assignee}`;
  }

  ngOnDestroy() {
    const workflowId = this.route.snapshot.paramMap.get("id");
    if (workflowId) {
      this.socket.leaveWorkflow(workflowId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadComments(taskId: string) {
    this.commentsLoading = true;
    this.api.get<TaskCommentsResponse>(`/tasks/${taskId}/comments`).subscribe({
      next: (response) => {
        this.selectedTaskComments = response.items;
        this.commentsLoading = false;
      },
      error: () => {
        this.selectedTaskComments = [];
        this.commentsLoading = false;
      }
    });
  }

  private loadTaskActivity(taskId: string) {
    this.activityLoading = true;
    this.api
      .get<ActivityResponse>("/activity-logs", {
        entityType: "task",
        entityId: taskId,
        page: 1,
        limit: 10
      })
      .subscribe({
        next: (response) => {
          this.selectedTaskActivities = response.items;
          this.activityLoading = false;
        },
        error: () => {
          this.selectedTaskActivities = [];
          this.activityLoading = false;
        }
      });
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

    if (this.selectedTask) {
      this.selectedTask = tasks.find((task) => task._id === this.selectedTask?._id);
      if (!this.selectedTask) {
        this.closeConversation();
      }
    }

    if (!this.taskForm.value.stageName) {
      this.taskForm.patchValue({ stageName: workflow.stages[0]?.name ?? "" });
    }
  }
}
