import { Router } from "express";
import { WorkflowController } from "../controllers/workflow.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createWorkflowSchema,
  generateWorkflowSchema,
  workflowListSchema
} from "../validators/workflow.validator";

const router = Router();
const controller = new WorkflowController();

router.use(authenticate);
router.get("/", validate(workflowListSchema), asyncHandler((req, res) => controller.list(req, res)));
router.post("/", validate(createWorkflowSchema), asyncHandler((req, res) => controller.create(req, res)));
router.post("/generate", validate(generateWorkflowSchema), asyncHandler((req, res) => controller.generate(req, res)));
router.get("/:id", asyncHandler((req, res) => controller.getById(req, res)));
router.patch("/:id", asyncHandler((req, res) => controller.update(req, res)));
router.delete("/:id", asyncHandler((req, res) => controller.delete(req, res)));

export default router;
