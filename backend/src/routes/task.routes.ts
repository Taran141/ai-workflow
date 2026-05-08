import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import { createTaskSchema, listTaskSchema, updateTaskSchema } from "../validators/task.validator";

const router = Router();
const controller = new TaskController();

router.use(authenticate);
router.get("/", validate(listTaskSchema), asyncHandler((req, res) => controller.list(req, res)));
router.post("/", validate(createTaskSchema), asyncHandler((req, res) => controller.create(req, res)));
router.patch("/:id", validate(updateTaskSchema), asyncHandler((req, res) => controller.update(req, res)));
router.delete("/:id", asyncHandler((req, res) => controller.delete(req, res)));

export default router;
