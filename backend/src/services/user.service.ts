import { UserRepository } from "../repositories/user.repository";

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  list() {
    return this.userRepository.findMany();
  }
}
