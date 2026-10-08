import { TaskCommentRepository } from "../repositories/taskComment.repository";
import { UserRepository } from "../repositories/user.repository";
import { AccessService } from "./access.service";

export class TaskCommentService {
  constructor(
    private readonly taskCommentRepository = new TaskCommentRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly accessService = new AccessService()
  ) {}

  async list(taskId: string, actor: Express.UserPayload) {
    await this.accessService.getViewableTask(actor, taskId);
    const comments = await this.taskCommentRepository.findMany({ taskId });
    return this.enrichComments(comments);
  }

  async create(payload: { taskId: string; actor: Express.UserPayload; message: string }) {
    const { task } = await this.accessService.getViewableTask(payload.actor, payload.taskId);

    const comment = await this.taskCommentRepository.create({
      taskId: payload.taskId,
      workflowId: task.workflowId,
      authorId: payload.actor.userId,
      message: payload.message
    });

    const [enrichedComment] = await this.enrichComments([comment.toObject() as unknown as Record<string, unknown>]);
    return { comment: enrichedComment, workflowId: task.workflowId.toString() };
  }

  private async enrichComments(items: Array<Record<string, unknown>>) {
    const authorIds = [...new Set(items.map((item) => this.getStringValue(item.authorId)).filter(Boolean) as string[])];
    const users = authorIds.length ? await this.userRepository.findManyByIds(authorIds) : [];
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    return items.map((item) => {
      const authorId = this.getStringValue(item.authorId);
      const author = authorId ? userMap.get(authorId) : undefined;
      return {
        ...item,
        authorName: author?.name ?? "Unknown user",
        authorRole: author?.role
      };
    });
  }

  private getStringValue(value: unknown) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") {
      const normalized = value.toString().trim();
      return normalized && normalized !== "[object Object]" ? normalized : undefined;
    }

    return undefined;
  }
}
