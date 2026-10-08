import { StatusCodes } from "http-status-codes";
import { Role } from "../constants/roles";
import { AppError } from "../utils/AppError";
import { TokenService } from "./token.service";
import { UserRepository } from "../repositories/user.repository";

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly tokenService = new TokenService()
  ) {}

  async register(payload: { name: string; email: string; password: string; phone?: string }) {
    const existing = await this.userRepository.findByEmail(payload.email);
    if (existing) {
      throw new AppError(StatusCodes.CONFLICT, "User already exists");
    }

    // The very first account bootstraps the workspace as its admin; everyone else starts as a regular user
    // and can be promoted by an admin.
    const role: Role = (await this.userRepository.count()) === 0 ? "admin" : "user";
    const user = await this.userRepository.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      role
    });
    const token = this.tokenService.sign({ userId: user._id.toString(), email: user.email, role: user.role });
    return { user, token };
  }

  async login(payload: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user || !(await user.comparePassword(payload.password))) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    const token = this.tokenService.sign({ userId: user._id.toString(), email: user.email, role: user.role });
    return { user, token };
  }

  /**
   * Turns a JWT into the current user. The role is read from the database rather than the token,
   * so promotions/demotions and deleted accounts take effect immediately.
   */
  async resolveSession(token: string): Promise<Express.UserPayload | null> {
    let claims: Express.UserPayload;
    try {
      claims = this.tokenService.verify(token);
    } catch {
      return null;
    }

    const user = await this.userRepository.findById(claims.userId);
    if (!user) {
      return null;
    }
    return { userId: user._id.toString(), email: user.email, role: user.role };
  }
}
