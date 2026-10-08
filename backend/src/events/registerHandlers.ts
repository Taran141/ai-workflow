import { DomainEvents, SocketEvents } from "../constants/events";
import { UserDocument } from "../models/User";
import { WorkflowDocument } from "../models/Workflow";
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
import { unique } from "../utils/text";

const activityService = new ActivityService();
const notificationService = new NotificationService();
const emailService = new EmailService();
const smsService = new SmsService();
const workflowRepository = new WorkflowRepository();
const taskRepository = new TaskRepository();
const userRepository = new UserRepository();

type NotificationType = "WORKFLOW_CREATED" | "AI_WORKFLOW_GENERATED" | "WORKFLOW_STATUS_UPDATED" | "TASK_ASSIGNED" | "TASK_COMPLETED";

type ActivityActorSnapshot = {
  actorId?: string;
  actorName?: string;
  actorRole?: string;
};

const optionalId = (value: unknown) => (value ? String(value) : undefined);

/** Everyone who can see a workflow: its owner and participants (admins are reached through their own room). */
const getWorkflowAudience = (
  workflow: Pick<WorkflowDocument, "createdBy" | "participants"> | null | undefined,
  extraUserIds: Array<string | undefined> = []
) =>
  unique([
    workflow?.createdBy?.toString(),
    ...(workflow?.participants.map((participant) => participant.toString()) ?? []),
    ...extraUserIds
  ]);

const canSendEmail = (user: UserDocument, preference: "workflowCreated" | "taskAssigned" | "taskCompleted") =>
  Boolean(user.email && user.notificationPreferences?.email?.[preference] !== false);

const canSendSms = (user: UserDocument, preference: "taskAssigned" | "workflowStatusUpdated") =>
  Boolean(user.phone && user.notificationPreferences?.sms?.[preference] === true);

const deliverEmail = async ({
  user,
  title,
  message,
  type,
  actorName,
  dedupeKey
}: {
  user: UserDocument;
  title: string;
  message: string;
  type: NotificationType;
  actorName?: string;
  dedupeKey: string;
}) => {
  const notification = await notificationService.create({
    userId: user._id,
    title,
    message,
    type,
    channel: "EMAIL",
    dedupeKey
  });

  // Already handled by an earlier attempt of the same event.
  if (notification.status !== "PENDING") {
    return;
  }

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
  type,
  dedupeKey
}: {
  user: UserDocument;
  title: string;
  message: string;
  type: NotificationType;
  dedupeKey: string;
}) => {
  const notification = await notificationService.create({
    userId: user._id,
    title,
    message,
    type,
    channel: "SMS",
    dedupeKey
  });

  if (notification.status !== "PENDING") {
    return;
  }

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
  actorName,
  dedupeKey
}: {
  recipients: UserDocument[];
  title: string;
  message: string;
  type: NotificationType;
  metadata: Record<string, unknown>;
  emailPreference?: "workflowCreated" | "taskAssigned" | "taskCompleted";
  smsPreference?: "taskAssigned" | "workflowStatusUpdated";
  actorName?: string;
  /** Unique per event + fan-out; combined with user and channel so retries never notify twice. */
  dedupeKey: string;
}) => {
  await Promise.allSettled(
    recipients.flatMap((user) => {
      const userKey = `${dedupeKey}:${user._id.toString()}`;
      const deliveries: Promise<unknown>[] = [
        notificationService.create({
          userId: user._id,
          title,
          message,
          type,
          channel: "IN_APP",
          metadata,
          dedupeKey: `${userKey}:IN_APP`
        })
      ];

      if (emailPreference && canSendEmail(user, emailPreference)) {
        deliveries.push(deliverEmail({ user, title, message, type, actorName, dedupeKey: `${userKey}:EMAIL` }));
      }

      if (smsPreference && canSendSms(user, smsPreference)) {
        deliveries.push(deliverSms({ user, title, message, type, dedupeKey: `${userKey}:SMS` }));
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

const getActorSnapshot = async (actorId?: string): Promise<ActivityActorSnapshot> => {
  if (!actorId) {
    return {};
  }

  const actor = await userRepository.findById(actorId);
  return {
    actorId,
    actorName: actor?.name ?? "Unknown user",
    actorRole: actor?.role
  };
};

const getTaskManagerRecipients = async ({
  taskCreatorId,
  workflowCreatorId,
  actorId
}: {
  taskCreatorId?: string;
  workflowCreatorId?: string;
  actorId?: string;
}) => {
  const recipientIds = unique([taskCreatorId, workflowCreatorId]).filter((userId) => userId !== actorId);
  return getUsers(recipientIds);
};

const publishActivity = async (activity: { toObject(): unknown }, audienceUserIds: string[]) => {
  socketGateway.emitActivity(await activityService.enrichItem(activity.toObject()), audienceUserIds);
};

export const registerEventHandlers = () => {
  eventBus.on(DomainEvents.WORKFLOW_CREATED, async ({ workflowId, actorId, title, participants }, { eventId }) => {
    const actorSnapshot = await getActorSnapshot(optionalId(actorId));
    const activity = await activityService.create({
      actorId,
      action: "WORKFLOW_CREATED",
      entityType: "workflow",
      entityId: String(workflowId),
      metadata: {
        workflowId: String(workflowId),
        workflowTitle: title,
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    const workflow = await workflowRepository.findById(String(workflowId));
    const recipientIds = unique((participants as string[] | undefined) ?? workflow?.participants.map((participant) => participant.toString()) ?? []);
    const recipients = await getUsers(recipientIds);

    await fanOutNotification({
      recipients,
      title: `Workflow created: ${String(title ?? workflow?.title ?? "Workflow")}`,
      message: "A new workflow has been created and is now available in your workspace.",
      type: "WORKFLOW_CREATED",
      metadata: { workflowId: String(workflowId) },
      emailPreference: "workflowCreated",
      actorName: actorSnapshot.actorName,
      dedupeKey: `${eventId}:participants`
    });

    const audience = getWorkflowAudience(workflow, recipientIds);
    socketGateway.emitToUsers(audience, SocketEvents.WORKFLOW_CREATED, { workflowId, actorId });
    await publishActivity(activity, audience);
  });

  eventBus.on(DomainEvents.AI_WORKFLOW_GENERATED, async ({ workflowId, actorId, prompt, title, participants }, { eventId }) => {
    const actorSnapshot = await getActorSnapshot(optionalId(actorId));
    const activity = await activityService.create({
      actorId,
      action: "AI_WORKFLOW_GENERATED",
      entityType: "workflow",
      entityId: String(workflowId),
      metadata: {
        workflowId: String(workflowId),
        prompt,
        workflowTitle: title,
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    const workflow = await workflowRepository.findById(String(workflowId));
    const recipientIds = unique((participants as string[] | undefined) ?? workflow?.participants.map((participant) => participant.toString()) ?? []);
    const recipients = await getUsers(recipientIds);

    await fanOutNotification({
      recipients,
      title: `AI workflow generated: ${String(title ?? workflow?.title ?? "Workflow")}`,
      message: "Your AI-generated workflow has been prepared and is ready for review.",
      type: "AI_WORKFLOW_GENERATED",
      metadata: { workflowId: String(workflowId), prompt },
      emailPreference: "workflowCreated",
      actorName: actorSnapshot.actorName,
      dedupeKey: `${eventId}:participants`
    });

    const audience = getWorkflowAudience(workflow, recipientIds);
    socketGateway.emitToUsers(audience, SocketEvents.WORKFLOW_CREATED, { workflowId, actorId });
    await publishActivity(activity, audience);
  });

  eventBus.on(DomainEvents.WORKFLOW_STATUS_UPDATED, async ({ workflowId, actorId, status, previousStatus, title, participants }, { eventId }) => {
    const actorSnapshot = await getActorSnapshot(optionalId(actorId));
    const activity = await activityService.create({
      actorId,
      action: "WORKFLOW_STATUS_UPDATED",
      entityType: "workflow",
      entityId: String(workflowId),
      metadata: {
        workflowId: String(workflowId),
        status,
        previousStatus,
        workflowTitle: title,
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    const workflow = await workflowRepository.findById(String(workflowId));
    const recipientIds = unique((participants as string[] | undefined) ?? workflow?.participants.map((participant) => participant.toString()) ?? []);
    const recipients = await getUsers(recipientIds);

    await fanOutNotification({
      recipients,
      title: `Workflow status updated: ${String(title ?? workflow?.title ?? "Workflow")}`,
      message: `Workflow status changed from ${String(previousStatus ?? "unknown")} to ${String(status)}.`,
      type: "WORKFLOW_STATUS_UPDATED",
      metadata: { workflowId: String(workflowId), status, previousStatus },
      smsPreference: "workflowStatusUpdated",
      dedupeKey: `${eventId}:participants`
    });

    await publishActivity(activity, getWorkflowAudience(workflow, recipientIds));
  });

  eventBus.on(DomainEvents.WORKFLOW_DELETED, async ({ workflowId, actorId, title, audience }, { eventId }) => {
    const actorSnapshot = await getActorSnapshot(optionalId(actorId));
    const activity = await activityService.create({
      actorId,
      action: "WORKFLOW_DELETED",
      entityType: "workflow",
      entityId: String(workflowId),
      metadata: {
        workflowId: String(workflowId),
        workflowTitle: title,
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    // The workflow no longer exists, so the audience was captured before deletion.
    const audienceUserIds = unique((audience as string[] | undefined) ?? []);
    socketGateway.emitToUsers(audienceUserIds, SocketEvents.WORKFLOW_DELETED, { workflowId });
    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.WORKFLOW_DELETED, { workflowId });
    await publishActivity(activity, audienceUserIds);
  });

  eventBus.on(DomainEvents.TASK_CREATED, async ({ taskId, workflowId, actorId, assignedTo, title }, { eventId }) => {
    const [actorSnapshot, workflow, assignee, task] = await Promise.all([
      getActorSnapshot(optionalId(actorId)),
      workflowRepository.findById(String(workflowId)),
      assignedTo ? userRepository.findById(String(assignedTo)) : Promise.resolve(null),
      taskRepository.findById(String(taskId))
    ]);

    const activity = await activityService.create({
      actorId,
      action: "TASK_CREATED",
      entityType: "task",
      entityId: String(taskId),
      metadata: {
        taskTitle: title,
        workflowId: String(workflowId),
        workflowTitle: workflow?.title,
        assignedTo,
        assignedToName: assignee?.name,
        assignedToRole: assignee?.role,
        taskCreatorId: task?.createdBy?.toString(),
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    if (assignee) {
      await fanOutNotification({
        recipients: [assignee],
        title: `Task assigned: ${String(title ?? "Task")}`,
        message: "A task has been assigned to you.",
        type: "TASK_ASSIGNED",
        metadata: { taskId, workflowId: String(workflowId), assignedTo },
        emailPreference: "taskAssigned",
        smsPreference: "taskAssigned",
        actorName: actorSnapshot.actorName,
        dedupeKey: `${eventId}:assignee`
      });

      const managerRecipients = await getTaskManagerRecipients({
        taskCreatorId: task?.createdBy?.toString(),
        workflowCreatorId: workflow?.createdBy?.toString(),
        actorId: optionalId(actorId)
      });

      if (managerRecipients.length) {
        const actorName = actorSnapshot.actorName ?? "A teammate";
        await fanOutNotification({
          recipients: managerRecipients,
          title: `Task assigned by ${actorName}: ${String(title ?? "Task")}`,
          message: `${actorName} assigned "${String(title ?? "Task")}" to ${assignee.name}.`,
          type: "TASK_ASSIGNED",
          metadata: { taskId, workflowId: String(workflowId), assignedTo, assignedBy: actorId },
          emailPreference: "taskAssigned",
          actorName: actorSnapshot.actorName,
          dedupeKey: `${eventId}:managers`
        });
      }
    }

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, assignedTo });
    await publishActivity(activity, getWorkflowAudience(workflow, [optionalId(assignedTo)]));
  });

  eventBus.on(DomainEvents.TASK_ASSIGNED, async ({ taskId, workflowId, actorId, assignedTo, previousAssignedTo, title }, { eventId }) => {
    const [actorSnapshot, workflow, task, assignee, previousAssignee] = await Promise.all([
      getActorSnapshot(optionalId(actorId)),
      workflowRepository.findById(String(workflowId)),
      taskRepository.findById(String(taskId)),
      assignedTo ? userRepository.findById(String(assignedTo)) : Promise.resolve(null),
      previousAssignedTo ? userRepository.findById(String(previousAssignedTo)) : Promise.resolve(null)
    ]);

    const activity = await activityService.create({
      actorId,
      action: "TASK_ASSIGNED",
      entityType: "task",
      entityId: String(taskId),
      metadata: {
        taskTitle: title ?? task?.title,
        workflowId: String(workflowId),
        workflowTitle: workflow?.title,
        assignedTo,
        assignedToName: assignee?.name,
        assignedToRole: assignee?.role,
        previousAssignedTo,
        previousAssignedToName: previousAssignee?.name,
        previousAssignedToRole: previousAssignee?.role,
        taskCreatorId: task?.createdBy?.toString(),
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    const audience = getWorkflowAudience(workflow, [optionalId(assignedTo), optionalId(previousAssignedTo)]);
    if (!assignedTo) {
      await publishActivity(activity, audience);
      return;
    }

    if (assignee) {
      await fanOutNotification({
        recipients: [assignee],
        title: `Task assigned: ${String(title ?? task?.title ?? "Task")}`,
        message: "A task has been assigned to you.",
        type: "TASK_ASSIGNED",
        metadata: { taskId, workflowId: String(workflowId), assignedTo },
        emailPreference: "taskAssigned",
        smsPreference: "taskAssigned",
        actorName: actorSnapshot.actorName,
        dedupeKey: `${eventId}:assignee`
      });
    }

    const managerRecipients = await getTaskManagerRecipients({
      taskCreatorId: task?.createdBy?.toString(),
      workflowCreatorId: workflow?.createdBy?.toString(),
      actorId: optionalId(actorId)
    });

    if (managerRecipients.length) {
      const actorName = actorSnapshot.actorName ?? "A teammate";
      await fanOutNotification({
        recipients: managerRecipients,
        title: `Task reassigned by ${actorName}: ${String(title ?? task?.title ?? "Task")}`,
        message: `${actorName} assigned "${String(title ?? task?.title ?? "Task")}" to ${assignee?.name ?? "a teammate"}.`,
        type: "TASK_ASSIGNED",
        metadata: {
          taskId,
          workflowId: String(workflowId),
          assignedTo,
          previousAssignedTo,
          assignedBy: actorId
        },
        emailPreference: "taskAssigned",
        actorName: actorSnapshot.actorName,
        dedupeKey: `${eventId}:managers`
      });
    }

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, assignedTo });
    await publishActivity(activity, audience);
  });

  eventBus.on(DomainEvents.TASK_UPDATED, async ({ taskId, workflowId, assignedTo }) => {
    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, assignedTo });
  });

  eventBus.on(DomainEvents.TASK_COMPLETED, async ({ taskId, workflowId, actorId, assignedTo, title }, { eventId }) => {
    const [actorSnapshot, workflow] = await Promise.all([
      getActorSnapshot(optionalId(actorId)),
      workflowRepository.findById(String(workflowId))
    ]);

    const activity = await activityService.create({
      actorId,
      action: "TASK_COMPLETED",
      entityType: "task",
      entityId: String(taskId),
      metadata: {
        taskTitle: title,
        workflowId: String(workflowId),
        workflowTitle: workflow?.title,
        assignedTo,
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    const recipientIds = unique([
      optionalId(assignedTo),
      ...(workflow?.participants.map((participant) => participant.toString()) ?? [])
    ]).filter((userId) => userId !== optionalId(actorId));
    const recipients = await getUsers(recipientIds);

    await fanOutNotification({
      recipients,
      title: `Task completed: ${String(title ?? "Task")}`,
      message: "A task in your workflow has been marked as completed.",
      type: "TASK_COMPLETED",
      metadata: { taskId, workflowId: String(workflowId) },
      emailPreference: "taskCompleted",
      actorName: actorSnapshot.actorName,
      dedupeKey: `${eventId}:participants`
    });

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, status: "done" });
    await publishActivity(activity, getWorkflowAudience(workflow, [optionalId(assignedTo)]));
  });

  eventBus.on(DomainEvents.TASK_DELETED, async ({ taskId, workflowId, actorId, title }, { eventId }) => {
    const [actorSnapshot, workflow] = await Promise.all([
      getActorSnapshot(optionalId(actorId)),
      workflowRepository.findById(String(workflowId))
    ]);

    const activity = await activityService.create({
      actorId,
      action: "TASK_DELETED",
      entityType: "task",
      entityId: String(taskId),
      metadata: {
        taskTitle: title,
        workflowId: String(workflowId),
        workflowTitle: workflow?.title,
        ...actorSnapshot
      },
      dedupeKey: `${eventId}:activity`
    });

    socketGateway.emitToWorkflow(String(workflowId), SocketEvents.TASK_UPDATED, { taskId, workflowId, deleted: true });
    await publishActivity(activity, getWorkflowAudience(workflow));
  });
};
