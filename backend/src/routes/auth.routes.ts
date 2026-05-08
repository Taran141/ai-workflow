import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/asyncHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import { loginSchema, registerSchema } from "../validators/auth.validator";

const router = Router();
const controller = new AuthController();

router.post("/register", validate(registerSchema), asyncHandler((req, res) => controller.register(req, res)));
router.post("/login", validate(loginSchema), asyncHandler((req, res) => controller.login(req, res)));

export default router;
