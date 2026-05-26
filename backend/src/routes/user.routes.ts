import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";

const router = Router();
const controller = new UserController();

router.use(authenticate);
router.get("/", asyncHandler((req, res) => controller.list(req, res)));

export default router;
