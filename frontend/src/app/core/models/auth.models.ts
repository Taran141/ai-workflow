export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export interface AuthResponse {
  user: User;
  token: string;
}

