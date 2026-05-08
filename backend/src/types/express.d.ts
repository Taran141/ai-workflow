import { Role } from "../constants/roles";

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      email: string;
      role: Role;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};

