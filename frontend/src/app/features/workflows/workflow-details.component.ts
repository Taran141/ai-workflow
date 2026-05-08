import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { ApiService } from "../../core/services/api.service";
import { SocketService } from "../../core/services/socket.service";
import { Task, Workflow } from "../../core/models/workflow.models";

@Component({
  selector: "app-workflow-details",
  template: `
    <div class="page-header" *ngIf="workflow">
      <div>
        <h1 class="page-title">{{ workflow.title }}</h1>
        <p class="page-subtitle">{{ workflow.description }}</p>
      </div>
      <div class="status-pill">{{ workflow.status }}</div>
    </div>

    <section class="two-col-layout" *ngIf="workflow">
      <div class="surface-card panel">
        <h3>Workflow Timeline</h3>
        <div class="timeline-item" *ngFor="let stage of workflow.stages">
          <strong>{{ stage.order }}. {{ stage.name }}</strong>
        </div>
      </div>
      <div class="surface-card panel">
        <h3>Automation Rules</h3>
        <div class="timeline-item" *ngFor="let rule of workflow.automationRules">
          <strong>{{ rule.trigger }}</strong>
          <div>{{ rule.action }}</div>
        </div>
      </div>
    </section>

    <section class="surface-card panel" style="margin-top: 20px;">
      <h3>Tasks</h3>
      <div class="task-row" *ngFor="let task of tasks">
        <strong>{{ task.title }}</strong>
        <div>{{ task.stageName }} · {{ task.priority }} · {{ task.status }}</div>
      </div>
    </section>
  `
})
export class WorkflowDetailsComponent implements OnInit, OnDestroy {
  workflow?: Workflow;
  tasks: Task[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
    private readonly socket: SocketService
  ) {}

  ngOnInit() {
    const workflowId = this.route.snapshot.paramMap.get("id")!;
    this.socket.joinWorkflow(workflowId);
    this.load(workflowId);
    this.socket
      .on("task-updated")
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load(workflowId));
  }

  load(workflowId: string) {
    this.api.get<{ workflow: Workflow; tasks: Task[] }>(`/workflows/${workflowId}`).subscribe((response) => {
      this.workflow = response.workflow;
      this.tasks = response.tasks;
    });
  }

  ngOnDestroy() {
    const workflowId = this.route.snapshot.paramMap.get("id");
    if (workflowId) {
      this.socket.leaveWorkflow(workflowId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}

