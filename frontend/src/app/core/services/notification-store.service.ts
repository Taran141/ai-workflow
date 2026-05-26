import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { NotificationItem } from "../models/workflow.models";
import { ApiService } from "./api.service";
import { SocketService } from "./socket.service";

interface NotificationResponse {
  items: NotificationItem[];
}

interface NotificationCreatedPayload {
  notification: NotificationItem;
  unreadCount: number;
}

@Injectable({ providedIn: "root" })
export class NotificationStoreService {
  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();
  private currentQuery: {
    channel?: "IN_APP" | "EMAIL" | "SMS";
    status?: "PENDING" | "SENT" | "FAILED" | "READ" | "SKIPPED";
    isRead?: boolean;
  } = {};

  constructor(private readonly api: ApiService, private readonly socket: SocketService) {
    this.socket.on<NotificationCreatedPayload>("notification-created").subscribe((payload) => {
      this.notificationsSubject.next([payload.notification, ...this.notificationsSubject.value]);
    });
  }

  load(query?: {
    channel?: "IN_APP" | "EMAIL" | "SMS";
    status?: "PENDING" | "SENT" | "FAILED" | "READ" | "SKIPPED";
    isRead?: boolean;
  }) {
    this.currentQuery = { ...this.currentQuery, ...query };
    this.api
      .get<NotificationResponse>("/notifications", {
        page: 1,
        limit: 20,
        channel: this.currentQuery.channel,
        status: this.currentQuery.status,
        isRead: this.currentQuery.isRead
      })
      .subscribe((response) => {
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

  delete(notificationId: string) {
    this.api.delete<void>(`/notifications/${notificationId}`).subscribe(() => {
      this.notificationsSubject.next(this.notificationsSubject.value.filter((item) => item._id !== notificationId));
    });
  }
}
