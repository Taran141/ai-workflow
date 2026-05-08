import { UserModel } from "../models/User";

export class UserRepository {
  create(data: Record<string, unknown>) {
    return UserModel.create(data);
  }

  findByEmail(email: string) {
    return UserModel.findOne({ email }).select("+password");
  }

  findById(id: string) {
    return UserModel.findById(id);
  }
}

