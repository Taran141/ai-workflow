import { UserModel } from "../models/User";

export class UserRepository {
  create(data: Record<string, unknown>) {
    return UserModel.create(data);
  }

  findMany() {
    return UserModel.find().sort({ name: 1 });
  }

  findByEmail(email: string) {
    return UserModel.findOne({ email }).select("+password");
  }

  findById(id: string) {
    return UserModel.findById(id);
  }

  findManyByIds(ids: string[]) {
    return UserModel.find({ _id: { $in: ids } });
  }
}
