import { Component, Input } from "@angular/core";

@Component({
  selector: "app-loading-skeleton",
  template: `<div class="skeleton" [style.height.px]="height"></div>`
})
export class LoadingSkeletonComponent {
  @Input() height = 80;
}

