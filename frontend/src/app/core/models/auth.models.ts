export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "user";
}

export interface AuthResponse {
  user: User;
  token: string;
}
