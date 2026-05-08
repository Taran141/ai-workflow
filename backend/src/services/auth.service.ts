import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/AppError";
import { TokenService } from "./token.service";
import { UserRepository } from "../repositories/user.repository";

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly tokenService = new TokenService()
  ) {}

  async register(payload: { name: string; email: string; password: string; role: "admin" | "user" }) {
    const existing = await this.userRepository.findByEmail(payload.email);
    if (existing) {
      throw new AppError(StatusCodes.CONFLICT, "User already exists");
    }

    const user = await this.userRepository.create(payload);
    const token = this.tokenService.sign({ userId: user._id, email: user.email, role: user.role });
    return { user, token };
  }

  async login(payload: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user || !(await user.comparePassword(payload.password))) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    const token = this.tokenService.sign({ userId: user._id, email: user.email, role: user.role });
    return { user, token };
  }
}

