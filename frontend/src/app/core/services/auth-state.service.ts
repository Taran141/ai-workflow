import { Injectable, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { User } from "../models/auth.models";
import { LocalStorageService } from "./local-storage.service";

@Injectable({ providedIn: "root" })
export class AuthStateService {
  private readonly tokenKey = "ai-workflow-token";
  private readonly userKey = "ai-workflow-user";
  private readonly storage = inject(LocalStorageService);
  private readonly userSubject = new BehaviorSubject<User | null>(this.storage.get<User>(this.userKey));
  readonly user$ = this.userSubject.asObservable();

  get token() {
    return this.storage.get<string>(this.tokenKey);
  }

  get user() {
    return this.userSubject.value;
  }

  setSession(token: string, user: User) {
    this.storage.set(this.tokenKey, token);
    this.storage.set(this.userKey, user);
    this.userSubject.next(user);
  }

  clearSession() {
    this.storage.remove(this.tokenKey);
    this.storage.remove(this.userKey);
    this.userSubject.next(null);
  }
}
