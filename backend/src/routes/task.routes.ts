import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import { idParamsSchema } from "../validators/common.validator";
import {
  createTaskCommentSchema,
  createTaskSchema,
  listTaskSchema,
  taskCommentParamsSchema,
  updateTaskSchema
} from "../validators/task.validator";

const router = Router();
const controller = new TaskController();

router.use(authenticate);
router.get("/", validate(listTaskSchema), asyncHandler((req, res) => controller.list(req, res)));
router.post("/", validate(createTaskSchema), asyncHandler((req, res) => controller.create(req, res)));
router.get("/:id/comments", validate(taskCommentParamsSchema), asyncHandler((req, res) => controller.listComments(req, res)));
router.post("/:id/comments", validate(createTaskCommentSchema), asyncHandler((req, res) => controller.createComment(req, res)));
router.patch("/:id", validate(updateTaskSchema), asyncHandler((req, res) => controller.update(req, res)));
router.delete("/:id", validate(idParamsSchema), asyncHandler((req, res) => controller.delete(req, res)));

export default router;
