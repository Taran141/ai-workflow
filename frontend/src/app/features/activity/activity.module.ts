import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SharedModule } from "../../shared/shared.module";
import { ActivityComponent } from "./activity.component";

const routes: Routes = [{ path: "", component: ActivityComponent }];

@NgModule({
  declarations: [ActivityComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ActivityModule {}

