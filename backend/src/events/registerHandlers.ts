import { DomainEvents, SocketEvents } from "../constants/events";
import { ActivityService } from "../services/activity.service";
import { eventBus } from "../services/eventBus.service";
import { NotificationService } from "../services/notification.service";
import { socketGateway } from "../services/socketGateway.service";

const activityService = new ActivityService();
const notificationService = new NotificationService();

export const registerEventHandlers = () => {
  eventBus.on(DomainEvents.WORKFLOW_CREATED, async ({ workflowId, actorId }) => {
    const activity = await activityService.create({
      actorId,
      action: "WORKFLOW_CREATED",
      entityType: "workflow",
      entityId: workflowId
    });
    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.WORKFLOW_CREATED, { workflowId, actorId });
    socketGateway.broadcastActivity(activity);
  });

  eventBus.on(DomainEvents.AI_WORKFLOW_GENERATED, async ({ workflowId, actorId, prompt }) => {
    const activity = await activityService.create({
      actorId,
      action: "AI_WORKFLOW_GENERATED",
      entityType: "workflow",
      entityId: workflowId,
      metadata: { prompt }
    });
    await notificationService.create({
      userId: String(actorId),
      title: "Workflow generated",
      message: "Your AI workflow is ready.",
      type: "workflow",
      meta: { workflowId }
    });
    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.WORKFLOW_CREATED, { workflowId, actorId, prompt });
    socketGateway.broadcastActivity(activity);
  });

  eventBus.on(DomainEvents.TASK_UPDATED, async ({ taskId, workflowId, actorId }) => {
    const activity = await activityService.create({
      actorId,
      action: "TASK_UPDATED",
      entityType: "task",
      entityId: taskId
    });
    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId });
    socketGateway.broadcastActivity(activity);
  });

  eventBus.on(DomainEvents.TASK_COMPLETED, async ({ taskId, workflowId, actorId }) => {
    const activity = await activityService.create({
      actorId,
      action: "TASK_COMPLETED",
      entityType: "task",
      entityId: taskId
    });
    await notificationService.create({
      userId: String(actorId),
      title: "Task completed",
      message: "A task was marked as done.",
      type: "task",
      meta: { taskId, workflowId }
    });
    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, status: "done" });
    socketGateway.broadcastActivity(activity);
  });
};

