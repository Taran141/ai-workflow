import { Injectable } from "@angular/core";
import { map } from "rxjs";
import { User } from "../models/auth.models";
import { ApiService } from "./api.service";

interface UserListResponse {
  items: User[];
}

@Injectable({ providedIn: "root" })
export class UserDirectoryService {
  constructor(private readonly api: ApiService) {}

  list() {
    return this.api.get<UserListResponse>("/users").pipe(map((response) => response.items));
  }
}
