import { DomainEvents, SocketEvents } from "../constants/events";
import { UserDocument } from "../models/User";
import { TaskRepository } from "../repositories/task.repository";
import { UserRepository } from "../repositories/user.repository";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { ActivityService } from "../services/activity.service";
import { EmailService } from "../services/email.service";
import { eventBus } from "../services/eventBus.service";
import { NotificationService } from "../services/notification.service";
import { SmsService } from "../services/sms.service";
import { socketGateway } from "../services/socketGateway.service";
import { buildEmailTemplate, buildSmsTemplate } from "../utils/notificationTemplates";

const activityService = new ActivityService();
const notificationService = new NotificationService();
const emailService = new EmailService();
const smsService = new SmsService();
const workflowRepository = new WorkflowRepository();
const taskRepository = new TaskRepository();
const userRepository = new UserRepository();

type NotificationType = "WORKFLOW_CREATED" | "AI_WORKFLOW_GENERATED" | "WORKFLOW_STATUS_UPDATED" | "TASK_ASSIGNED" | "TASK_COMPLETED";

const unique = (values: Array<string | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))];

const canSendEmail = (user: UserDocument, preference: "workflowCreated" | "taskAssigned" | "taskCompleted") =>
  Boolean(user.email && user.notificationPreferences?.email?.[preference] !== false);

const canSendSms = (user: UserDocument, preference: "taskAssigned" | "workflowStatusUpdated") =>
  Boolean(user.phone && user.notificationPreferences?.sms?.[preference] === true);

const deliverEmail = async ({
  user,
  title,
  message,
  type,
  actorName
}: {
  user: UserDocument;
  title: string;
  message: string;
  type: NotificationType;
  actorName?: string;
}) => {
  const notification = await notificationService.create({
    userId: user._id,
    title,
    message,
    type,
    channel: "EMAIL"
  });

  try {
    const emailTemplate = buildEmailTemplate({ title, message, type, actorName });
    const result = await emailService.send({
      to: user.email,
      ...emailTemplate
    });

    if (result.skipped) {
      await notificationService.markAsSkipped(notification._id, "Email service is not configured");
      return;
    }

    await notificationService.markAsSent(notification._id, result.messageId);
  } catch (error) {
    await notificationService.markAsFailed(
      notification._id,
      error instanceof Error ? error.message : "Failed to send email notification"
    );
  }
};

const deliverSms = async ({
  user,
  title,
  message,
  type
}: {
  user: UserDocument;
  title: string;
  message: string;
  type: NotificationType;
}) => {
  const notification = await notificationService.create({
    userId: user._id,
    title,
    message,
    type,
    channel: "SMS"
  });

  try {
    const result = await smsService.send(user.phone!, buildSmsTemplate({ title, message }));
    if (result.skipped) {
      await notificationService.markAsSkipped(notification._id, "SMS service is not configured");
      return;
    }

    await notificationService.markAsSent(notification._id, result.messageId);
  } catch (error) {
    await notificationService.markAsFailed(
      notification._id,
      error instanceof Error ? error.message : "Failed to send SMS notification"
    );
  }
};

const fanOutNotification = async ({
  recipients,
  title,
  message,
  type,
  metadata,
  emailPreference,
  smsPreference,
  actorName
}: {
  recipients: UserDocument[];
  title: string;
  message: string;
  type: NotificationType;
  metadata: Record<string, unknown>;
  emailPreference?: "workflowCreated" | "taskAssigned" | "taskCompleted";
  smsPreference?: "taskAssigned" | "workflowStatusUpdated";
  actorName?: string;
}) => {
  await Promise.allSettled(
    recipients.flatMap((user) => {
      const deliveries: Promise<unknown>[] = [
        notificationService.create({
          userId: user._id,
          title,
          message,
          type,
          channel: "IN_APP",
          metadata
        })
      ];

      if (emailPreference && canSendEmail(user, emailPreference)) {
        deliveries.push(deliverEmail({ user, title, message, type, actorName }));
      }

      if (smsPreference && canSendSms(user, smsPreference)) {
        deliveries.push(deliverSms({ user, title, message, type }));
      }

      return deliveries;
    })
  );
};

const getUsers = async (userIds: string[]) => {
  if (!userIds.length) {
    return [];
  }

  return userRepository.findManyByIds(userIds);
};

export const registerEventHandlers = () => {
  eventBus.on(DomainEvents.WORKFLOW_CREATED, async ({ workflowId, actorId, title, participants }) => {
    const activity = await activityService.create({
      actorId,
      action: "WORKFLOW_CREATED",
      entityType: "workflow",
      entityId: workflowId
    });

    const workflow = await workflowRepository.findById(String(workflowId));
    const recipientIds = unique((participants as string[] | undefined) ?? workflow?.participants.map((participant) => participant.toString()) ?? []);
    const recipients = await getUsers(recipientIds);
    const actor = actorId ? await userRepository.findById(String(actorId)) : null;

    await fanOutNotification({
      recipients,
      title: `Workflow created: ${String(title ?? workflow?.title ?? "Workflow")}`,
      message: "A new workflow has been created and is now available in your workspace.",
      type: "WORKFLOW_CREATED",
      metadata: { workflowId },
      emailPreference: "workflowCreated",
      actorName: actor?.name
    });

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.WORKFLOW_CREATED, { workflowId, actorId });
    socketGateway.broadcastActivity(activity);
  });

  eventBus.on(DomainEvents.AI_WORKFLOW_GENERATED, async ({ workflowId, actorId, prompt, title, participants }) => {
    const activity = await activityService.create({
      actorId,
      action: "AI_WORKFLOW_GENERATED",
      entityType: "workflow",
      entityId: workflowId,
      metadata: { prompt }
    });

    const workflow = await workflowRepository.findById(String(workflowId));
    const recipientIds = unique((participants as string[] | undefined) ?? workflow?.participants.map((participant) => participant.toString()) ?? []);
    const recipients = await getUsers(recipientIds);
    const actor = actorId ? await userRepository.findById(String(actorId)) : null;

    await fanOutNotification({
      recipients,
      title: `AI workflow generated: ${String(title ?? workflow?.title ?? "Workflow")}`,
      message: "Your AI-generated workflow has been prepared and is ready for review.",
      type: "AI_WORKFLOW_GENERATED",
      metadata: { workflowId, prompt },
      emailPreference: "workflowCreated",
      actorName: actor?.name
    });

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.WORKFLOW_CREATED, { workflowId, actorId, prompt });
    socketGateway.broadcastActivity(activity);
  });

  eventBus.on(DomainEvents.WORKFLOW_STATUS_UPDATED, async ({ workflowId, actorId, status, previousStatus, title, participants }) => {
    const activity = await activityService.create({
      actorId,
      action: "WORKFLOW_STATUS_UPDATED",
      entityType: "workflow",
      entityId: workflowId,
      metadata: { status, previousStatus }
    });

    const workflow = await workflowRepository.findById(String(workflowId));
    const recipientIds = unique((participants as string[] | undefined) ?? workflow?.participants.map((participant) => participant.toString()) ?? []);
    const recipients = await getUsers(recipientIds);

    await fanOutNotification({
      recipients,
      title: `Workflow status updated: ${String(title ?? workflow?.title ?? "Workflow")}`,
      message: `Workflow status changed from ${String(previousStatus ?? "unknown")} to ${String(status)}.`,
      type: "WORKFLOW_STATUS_UPDATED",
      metadata: { workflowId, status, previousStatus },
      smsPreference: "workflowStatusUpdated"
    });

    socketGateway.broadcastActivity(activity);
  });

  eventBus.on(DomainEvents.TASK_ASSIGNED, async ({ taskId, workflowId, actorId, assignedTo, title }) => {
    const activity = await activityService.create({
      actorId,
      action: "TASK_ASSIGNED",
      entityType: "task",
      entityId: taskId,
      metadata: { assignedTo }
    });

    if (!assignedTo) {
      socketGateway.broadcastActivity(activity);
      return;
    }

    const [task, actor, assignee] = await Promise.all([
      taskRepository.findById(String(taskId)),
      actorId ? userRepository.findById(String(actorId)) : Promise.resolve(null),
      userRepository.findById(String(assignedTo))
    ]);

    if (assignee) {
      await fanOutNotification({
        recipients: [assignee],
        title: `Task assigned: ${String(title ?? task?.title ?? "Task")}`,
        message: "A task has been assigned to you.",
        type: "TASK_ASSIGNED",
        metadata: { taskId, workflowId, assignedTo },
        emailPreference: "taskAssigned",
        smsPreference: "taskAssigned",
        actorName: actor?.name
      });
    }

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, assignedTo });
    socketGateway.broadcastActivity(activity);
  });

  eventBus.on(DomainEvents.TASK_UPDATED, async ({ taskId, workflowId, assignedTo }) => {
    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, assignedTo });
  });

  eventBus.on(DomainEvents.TASK_COMPLETED, async ({ taskId, workflowId, actorId, assignedTo, title }) => {
    const activity = await activityService.create({
      actorId,
      action: "TASK_COMPLETED",
      entityType: "task",
      entityId: taskId
    });

    const workflow = await workflowRepository.findById(String(workflowId));
    const recipientIds = unique([
      assignedTo as string | undefined,
      ...(workflow?.participants.map((participant) => participant.toString()) ?? [])
    ]).filter((userId) => userId !== String(actorId));
    const recipients = await getUsers(recipientIds);
    const actor = actorId ? await userRepository.findById(String(actorId)) : null;

    await fanOutNotification({
      recipients,
      title: `Task completed: ${String(title ?? "Task")}`,
      message: "A task in your workflow has been marked as completed.",
      type: "TASK_COMPLETED",
      metadata: { taskId, workflowId },
      emailPreference: "taskCompleted",
      actorName: actor?.name
    });

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, status: "done" });
    socketGateway.broadcastActivity(activity);
  });
};
