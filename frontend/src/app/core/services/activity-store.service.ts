import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ActivityItem } from "../models/workflow.models";
import { ApiService } from "./api.service";
import { SocketService } from "./socket.service";

interface ActivityResponse {
  items: ActivityItem[];
}

@Injectable({ providedIn: "root" })
export class ActivityStoreService {
  private readonly activitiesSubject = new BehaviorSubject<ActivityItem[]>([]);
  readonly activities$ = this.activitiesSubject.asObservable();

  constructor(private readonly api: ApiService, private readonly socket: SocketService) {
    this.socket.on<ActivityItem>("activity-added").subscribe((item) => {
      this.activitiesSubject.next([item, ...this.activitiesSubject.value].slice(0, 20));
    });
  }

  load() {
    this.api.get<ActivityResponse>("/activity-logs", { page: 1, limit: 10 }).subscribe((response) => {
      this.activitiesSubject.next(response.items);
    });
  }
}

