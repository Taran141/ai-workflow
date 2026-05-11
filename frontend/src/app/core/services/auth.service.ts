import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { tap } from "rxjs";
import { AuthResponse } from "../models/auth.models";
import { ApiService } from "./api.service";
import { AuthStateService } from "./auth-state.service";

@Injectable({ providedIn: "root" })
export class AuthService {
  constructor(
    private readonly api: ApiService,
    private readonly authState: AuthStateService,
    private readonly router: Router
  ) {}

  login(payload: { email: string; password: string }) {
    return this.api.post<AuthResponse>("/auth/login", payload).pipe(
      tap((response) => this.authState.setSession(response.token, response.user))
    );
  }

  register(payload: { name: string; email: string; password: string; phone?: string; role: "admin" | "user" }) {
    return this.api.post<AuthResponse>("/auth/register", payload).pipe(
      tap((response) => this.authState.setSession(response.token, response.user))
    );
  }

  logout() {
    this.authState.clearSession();
    this.router.navigateByUrl("/auth/login");
  }
}
