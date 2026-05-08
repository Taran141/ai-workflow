import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { NotificationItem } from "../models/workflow.models";
import { ApiService } from "./api.service";
import { SocketService } from "./socket.service";

interface NotificationResponse {
  items: NotificationItem[];
}

@Injectable({ providedIn: "root" })
export class NotificationStoreService {
  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  constructor(private readonly api: ApiService, private readonly socket: SocketService) {
    this.socket.on<NotificationItem>("notification-created").subscribe((item) => {
      this.notificationsSubject.next([item, ...this.notificationsSubject.value]);
    });
  }

  load() {
    this.api.get<NotificationResponse>("/notifications", { page: 1, limit: 8 }).subscribe((response) => {
      this.notificationsSubject.next(response.items);
    });
  }

  markAsRead(notificationId: string) {
    this.api.patch<NotificationItem>(`/notifications/${notificationId}/read`, {}).subscribe((updated) => {
      this.notificationsSubject.next(
        this.notificationsSubject.value.map((item) => (item._id === updated._id ? updated : item))
      );
    });
  }
}

