import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { io, Socket } from "socket.io-client";
import { appConfig } from "../config/app-config";
import { AuthStateService } from "./auth-state.service";

@Injectable({ providedIn: "root" })
export class SocketService {
  private socket?: Socket;
  private readonly listeners = new Map<string, Set<(payload: unknown) => void>>();

  constructor(private readonly authState: AuthStateService) {}

  connect() {
    if (this.socket || !this.authState.token) {
      return;
    }
    this.socket = io(appConfig.socketUrl, {
      autoConnect: true,
      reconnection: true,
      auth: { token: this.authState.token }
    });

    this.listeners.forEach((handlers, eventName) => {
      handlers.forEach((handler) => this.socket?.on(eventName, handler));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  joinWorkflow(workflowId: string) {
    this.socket?.emit("workflow:join", workflowId);
  }

  leaveWorkflow(workflowId: string) {
    this.socket?.emit("workflow:leave", workflowId);
  }

  on<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (payload: unknown) => subscriber.next(payload as T);
      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }
      this.listeners.get(eventName)!.add(handler);
      this.socket?.on(eventName, handler);

      return () => {
        this.listeners.get(eventName)?.delete(handler);
        this.socket?.off(eventName, handler);
      };
    });
  }
}
