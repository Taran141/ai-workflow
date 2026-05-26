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
  private readonly querySubject = new BehaviorSubject<{
    search: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>({ search: "", sortBy: "createdAt", sortOrder: "desc" });

  readonly workflows$ = this.workflowsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(private readonly api: ApiService, private readonly socket: SocketService) {
    this.querySubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
        switchMap((query) => {
          this.loadingSubject.next(true);
          return this.api.get<WorkflowListResponse>("/workflows", {
            search: query.search,
            status: query.status,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
            page: 1,
            limit: 10
          });
        })
      )
      .subscribe((response) => {
        this.workflowsSubject.next(response.items);
        this.loadingSubject.next(false);
      });

    this.socket.on<Workflow>("workflow-created").subscribe(() => this.refresh());
    this.socket.on("task-updated").subscribe(() => this.refresh());
  }

  refresh(overrides?: Partial<{ search: string; status?: string; sortBy?: string; sortOrder?: "asc" | "desc" }>) {
    this.querySubject.next({ ...this.querySubject.value, ...overrides });
  }

  setSearch(search: string) {
    this.refresh({ search });
  }

  setStatus(status?: string) {
    this.refresh({ status });
  }

  setSort(sortBy?: string, sortOrder?: "asc" | "desc") {
    this.refresh({ sortBy, sortOrder });
  }

  addOptimistic(workflow: Workflow) {
    this.workflowsSubject.next([workflow, ...this.workflowsSubject.value]);
  }
}
