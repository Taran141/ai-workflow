import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SharedModule } from "../../shared/shared.module";
import { WorkflowDetailsComponent } from "./workflow-details.component";
import { WorkflowListComponent } from "./workflow-list.component";

const routes: Routes = [
  { path: "", component: WorkflowListComponent },
  { path: ":id", component: WorkflowDetailsComponent }
];

@NgModule({
  declarations: [WorkflowListComponent, WorkflowDetailsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class WorkflowsModule {}

