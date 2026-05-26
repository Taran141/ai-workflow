import { Router } from "express";
import activityRoutes from "./activity.routes";
import authRoutes from "./auth.routes";
import notificationRoutes from "./notification.routes";
import taskRoutes from "./task.routes";
import userRoutes from "./user.routes";
import workflowRoutes from "./workflow.routes";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/auth", authRoutes);
router.use("/workflows", workflowRoutes);
router.use("/tasks", taskRoutes);
router.use("/notifications", notificationRoutes);
router.use("/activity-logs", activityRoutes);
router.use("/users", userRoutes);

export default router;
