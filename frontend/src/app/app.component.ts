import { Component, OnInit } from "@angular/core";
import { AuthStateService } from "./core/services/auth-state.service";
import { SocketService } from "./core/services/socket.service";

@Component({
  selector: "app-root",
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  constructor(
    private readonly authState: AuthStateService,
    private readonly socketService: SocketService
  ) {}

  ngOnInit() {
    if (this.authState.token) {
      this.socketService.connect();
    }

    this.authState.user$.subscribe((user) => {
      if (user) {
        this.socketService.connect();
      } else {
        this.socketService.disconnect();
      }
    });
  }
}

