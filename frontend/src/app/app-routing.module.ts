import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { ShellComponent } from "./shared/ui/shell.component";

const routes: Routes = [
  {
    path: "auth",
    loadChildren: () => import("./features/auth/auth.module").then((m) => m.AuthModule)
  },
  {
    path: "",
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: "dashboard",
        loadChildren: () => import("./features/dashboard/dashboard.module").then((m) => m.DashboardModule)
      },
      {
        path: "workflows",
        loadChildren: () => import("./features/workflows/workflows.module").then((m) => m.WorkflowsModule)
      },
      {
        path: "notifications",
        loadChildren: () => import("./features/notifications/notifications.module").then((m) => m.NotificationsModule)
      },
      {
        path: "users",
        loadChildren: () => import("./features/users/users.module").then((m) => m.UsersModule)
      },
      {
        path: "activity",
        loadChildren: () => import("./features/activity/activity.module").then((m) => m.ActivityModule)
      },
      { path: "", pathMatch: "full", redirectTo: "dashboard" }
    ]
  },
  { path: "**", redirectTo: "/dashboard" }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
