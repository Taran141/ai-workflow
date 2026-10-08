import { StatusCodes } from "http-status-codes";
import { Role } from "../constants/roles";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../utils/AppError";

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async list(viewer: Express.UserPayload) {
    const users = await this.userRepository.findMany();
    return users.map((user) => {
      const json = user.toJSON() as Record<string, unknown>;
      // The directory is for picking assignees; contact details stay private to admins and the user themselves.
      if (viewer.role !== "admin" && user._id.toString() !== viewer.userId) {
        delete json.phone;
        delete json.notificationPreferences;
      }
      return json;
    });
  }

  async updateRole(userId: string, role: Role, actor: Express.UserPayload) {
    if (userId === actor.userId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "You cannot change your own role");
    }

    const user = await this.userRepository.updateRole(userId, role);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    return user;
  }
}
