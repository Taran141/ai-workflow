import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import { listNotificationSchema, notificationParamsSchema } from "../validators/notification.validator";

const router = Router();
const controller = new NotificationController();

router.use(authenticate);
router.get("/", validate(listNotificationSchema), asyncHandler((req, res) => controller.list(req, res)));
router.get("/unread-count", asyncHandler((req, res) => controller.unreadCount(req, res)));
router.patch("/:id/read", validate(notificationParamsSchema), asyncHandler((req, res) => controller.markAsRead(req, res)));
router.delete("/:id", validate(notificationParamsSchema), asyncHandler((req, res) => controller.delete(req, res)));

export default router;
