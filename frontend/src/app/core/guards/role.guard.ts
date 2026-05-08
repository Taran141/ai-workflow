import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router } from "@angular/router";
import { AuthStateService } from "../services/auth-state.service";

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const allowedRoles = route.data["roles"] as string[] | undefined;

  if (!allowedRoles?.length || (authState.user && allowedRoles.includes(authState.user.role))) {
    return true;
  }

  return router.createUrlTree(["/dashboard"]);
};

