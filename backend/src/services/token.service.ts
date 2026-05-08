import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "../constants/roles";

export class TokenService {
  sign(payload: { userId: string; email: string; role: Role }) {
    const expiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
  }

  verify(token: string) {
    return jwt.verify(token, env.JWT_SECRET) as Express.UserPayload;
  }
}
