import { Injectable } from "@angular/core";
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from "rxjs";
import { Workflow } from "../models/workflow.models";
import { ApiService } from "./api.service";
import { SocketService } from "./socket.service";

interface WorkflowListResponse {
  items: Workflow[];
  meta: { total: number; page: number; limit: number };
}

@Injectable({ providedIn: "root" })
export class WorkflowStoreService {
  private readonly workflowsSubject = new BehaviorSubject<Workflow[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly searchSubject = new BehaviorSubject<string>("");

  readonly workflows$ = this.workflowsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(private readonly api: ApiService, private readonly socket: SocketService) {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((search) => {
          this.loadingSubject.next(true);
          return this.api.get<WorkflowListResponse>("/workflows", { search, page: 1, limit: 10 });
        })
      )
      .subscribe((response) => {
        this.workflowsSubject.next(response.items);
        this.loadingSubject.next(false);
      });

    this.socket.on<Workflow>("workflow-created").subscribe(() => this.refresh());
    this.socket.on("task-updated").subscribe(() => this.refresh());
  }

  refresh(search = this.searchSubject.value) {
    this.searchSubject.next(search);
  }

  setSearch(search: string) {
    this.searchSubject.next(search);
  }

  addOptimistic(workflow: Workflow) {
    this.workflowsSubject.next([workflow, ...this.workflowsSubject.value]);
  }
}

