import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import { updateUserRoleSchema } from "../validators/user.validator";

const router = Router();
const controller = new UserController();

router.use(authenticate);
router.get("/", asyncHandler((req, res) => controller.list(req, res)));
router.patch(
  "/:id/role",
  authorize("admin"),
  validate(updateUserRoleSchema),
  asyncHandler((req, res) => controller.updateRole(req, res))
);

export default router;
