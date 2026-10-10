import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { ActivityType, Role, Task } from '@prisma/client';

const MAX_TITLE_LENGTH = 200;

interface UpdateSubtaskInput {
  title?: string;
  isCompleted?: boolean;
}

export class SubtaskService {
  // ─── ACCESS HELPERS ─────────────────────────────────
  private static async getTaskOrFail(taskId: number): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    return task;
  }

  // Admins and project members can view the checklist
  private static async assertCanView(task: Task, userId: number, userRole: Role) {
    if (userRole === Role.ADMIN) return;

    const isMember = await prisma.projectMember.findFirst({
      where: { projectId: task.projectId, userId },
    });
    if (!isMember) {
      throw new AppError('Access forbidden: You are not a member of this project', 403);
    }
  }

  // Project managers in the project and collaborators assigned to the task can change the checklist
  private static async assertCanEdit(task: Task, userId: number, userRole: Role) {
    if (userRole === Role.ADMIN) {
      throw new AppError('Administrators cannot modify task checklists', 403);
    }

    if (userRole === Role.COLLABORATOR) {
      const assignment = await prisma.taskAssignment.findUnique({
        where: { taskId_userId: { taskId: task.id, userId } },
      });
      if (!assignment) {
        throw new AppError('Collaborators can only update checklists on tasks assigned to them', 403);
      }
      return;
    }

    const isMember = await prisma.projectMember.findFirst({
      where: { projectId: task.projectId, userId },
    });
    if (!isMember) {
      throw new AppError('Access forbidden: You are not a member of this project', 403);
    }
  }

  private static validateTitle(title: unknown): string {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new AppError('Checklist item title cannot be empty', 400);
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      throw new AppError(`Checklist item title cannot exceed ${MAX_TITLE_LENGTH} characters`, 400);
    }
    return title.trim();
  }

  // ─── GET SUBTASKS FOR TASK ──────────────────────────
  public static async getSubtasks(taskId: number, userId: number, userRole: Role) {
    const task = await this.getTaskOrFail(taskId);
    await this.assertCanView(task, userId, userRole);

    return prisma.subtask.findMany({
      where: { taskId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }

  // ─── ADD SUBTASK ────────────────────────────────────
  public static async addSubtask(taskId: number, title: unknown, userId: number, userRole: Role) {
    const task = await this.getTaskOrFail(taskId);
    await this.assertCanEdit(task, userId, userRole);
    const cleanTitle = this.validateTitle(title);

    const last = await prisma.subtask.findFirst({
      where: { taskId },
      orderBy: { position: 'desc' },
    });

    const subtask = await prisma.subtask.create({
      data: {
        title: cleanTitle,
        taskId,
        position: last ? last.position + 1 : 0,
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action: ActivityType.UPDATED,
        description: `Added checklist item: "${cleanTitle}"`,
      },
    });

    return subtask;
  }

  // ─── UPDATE SUBTASK (RENAME / TOGGLE) ───────────────
  public static async updateSubtask(subtaskId: number, input: UpdateSubtaskInput, userId: number, userRole: Role) {
    const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!subtask) {
      throw new AppError('Checklist item not found', 404);
    }

    const task = await this.getTaskOrFail(subtask.taskId);
    await this.assertCanEdit(task, userId, userRole);

    const data: { title?: string; isCompleted?: boolean; completedAt?: Date | null } = {};

    if (input.title !== undefined) {
      data.title = this.validateTitle(input.title);
    }

    if (input.isCompleted !== undefined) {
      if (typeof input.isCompleted !== 'boolean') {
        throw new AppError('isCompleted must be true or false', 400);
      }
      data.isCompleted = input.isCompleted;
      data.completedAt = input.isCompleted ? new Date() : null;
    }

    if (Object.keys(data).length === 0) {
      throw new AppError('Nothing to update: provide title or isCompleted', 400);
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });

    let description: string | null = null;
    if (data.isCompleted !== undefined && data.isCompleted !== subtask.isCompleted) {
      description = data.isCompleted
        ? `Completed checklist item: "${updated.title}"`
        : `Reopened checklist item: "${updated.title}"`;
    } else if (data.title !== undefined && data.title !== subtask.title) {
      description = `Renamed checklist item from "${subtask.title}" to "${updated.title}"`;
    }

    if (description) {
      await prisma.taskActivity.create({
        data: {
          taskId: subtask.taskId,
          userId,
          action: ActivityType.UPDATED,
          description,
        },
      });
    }

    return updated;
  }

  // ─── DELETE SUBTASK ─────────────────────────────────
  public static async deleteSubtask(subtaskId: number, userId: number, userRole: Role) {
    const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!subtask) {
      throw new AppError('Checklist item not found', 404);
    }

    const task = await this.getTaskOrFail(subtask.taskId);
    await this.assertCanEdit(task, userId, userRole);

    await prisma.subtask.delete({ where: { id: subtaskId } });

    await prisma.taskActivity.create({
      data: {
        taskId: subtask.taskId,
        userId,
        action: ActivityType.DELETED,
        description: `Removed checklist item: "${subtask.title}"`,
      },
    });
  }
}
