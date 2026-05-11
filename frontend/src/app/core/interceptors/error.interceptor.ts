import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { Observable, catchError, throwError } from "rxjs";
import { AuthStateService } from "../services/auth-state.service";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly authState: AuthStateService,
    private readonly router: Router
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error) => {
        if (error?.status === 401) {
          this.authState.clearSession();
          this.router.navigateByUrl("/auth/login");
        }

        this.snackBar.open(error?.error?.message ?? "Request failed", "Dismiss", { duration: 3000 });
        return throwError(() => error);
      })
    );
  }
}
