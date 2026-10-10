import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { ActivityType, Prisma, Role } from '@prisma/client';

const MAX_NAME_LENGTH = 30;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface LabelInput {
  name?: unknown;
  color?: unknown;
}

export class LabelService {
  // ─── ACCESS HELPERS ─────────────────────────────────
  private static async getProjectOrFail(projectId: number) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.isDeleted) {
      throw new AppError('Project not found', 404);
    }
    return project;
  }

  private static async isProjectMember(projectId: number, ownerId: number, userId: number) {
    if (ownerId === userId) return true;
    const member = await prisma.projectMember.findFirst({ where: { projectId, userId } });
    return Boolean(member);
  }

  private static async assertCanView(projectId: number, userId: number, userRole: Role) {
    const project = await this.getProjectOrFail(projectId);
    if (userRole === Role.ADMIN) return project;
    if (!(await this.isProjectMember(projectId, project.ownerId, userId))) {
      throw new AppError('Access forbidden: You are not a member of this project', 403);
    }
    return project;
  }

  // Only project managers who belong to the project can manage its labels
  private static async assertCanManage(projectId: number, userId: number, userRole: Role) {
    const project = await this.getProjectOrFail(projectId);
    if (userRole !== Role.PROJECT_MANAGER || !(await this.isProjectMember(projectId, project.ownerId, userId))) {
      throw new AppError('Only project managers in this project can manage labels', 403);
    }
    return project;
  }

  private static validateName(name: unknown): string {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Label name cannot be empty', 400);
    }
    const clean = name.trim();
    if (clean.length > MAX_NAME_LENGTH) {
      throw new AppError(`Label name cannot exceed ${MAX_NAME_LENGTH} characters`, 400);
    }
    return clean;
  }

  private static validateColor(color: unknown): string {
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      throw new AppError('Label color must be a hex color like #118B95', 400);
    }
    return color.toUpperCase();
  }

  private static rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('A label with this name already exists in the project', 409);
    }
    throw error;
  }

  // ─── GET PROJECT LABELS ─────────────────────────────
  public static async getProjectLabels(projectId: number, userId: number, userRole: Role) {
    await this.assertCanView(projectId, userId, userRole);

    return prisma.label.findMany({
      where: { projectId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ─── CREATE LABEL ───────────────────────────────────
  public static async createLabel(projectId: number, input: LabelInput, userId: number, userRole: Role) {
    await this.assertCanManage(projectId, userId, userRole);

    const name = this.validateName(input.name);
    const color = input.color === undefined ? undefined : this.validateColor(input.color);

    try {
      return await prisma.label.create({
        data: { name, projectId, ...(color && { color }) },
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  // ─── UPDATE LABEL ───────────────────────────────────
  public static async updateLabel(labelId: number, input: LabelInput, userId: number, userRole: Role) {
    const label = await prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new AppError('Label not found', 404);
    }
    await this.assertCanManage(label.projectId, userId, userRole);

    const data: { name?: string; color?: string } = {};
    if (input.name !== undefined) data.name = this.validateName(input.name);
    if (input.color !== undefined) data.color = this.validateColor(input.color);

    if (Object.keys(data).length === 0) {
      throw new AppError('Nothing to update: provide name or color', 400);
    }

    try {
      return await prisma.label.update({ where: { id: labelId }, data });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  // ─── DELETE LABEL ───────────────────────────────────
  public static async deleteLabel(labelId: number, userId: number, userRole: Role) {
    const label = await prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new AppError('Label not found', 404);
    }
    await this.assertCanManage(label.projectId, userId, userRole);

    // Task links are removed by the cascade on task_labels
    await prisma.label.delete({ where: { id: labelId } });
  }

  // ─── SET TASK LABELS ────────────────────────────────
  public static async setTaskLabels(taskId: number, labelIds: unknown, userId: number, userRole: Role) {
    if (!Array.isArray(labelIds) || !labelIds.every((id) => Number.isInteger(id))) {
      throw new AppError('labelIds must be an array of label IDs', 400);
    }
    const uniqueIds = [...new Set(labelIds as number[])];

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    await this.assertCanManage(task.projectId, userId, userRole);

    const labels = await prisma.label.findMany({
      where: { id: { in: uniqueIds }, projectId: task.projectId },
    });
    if (labels.length !== uniqueIds.length) {
      throw new AppError('One or more labels do not belong to this task\'s project', 400);
    }

    await prisma.$transaction([
      prisma.taskLabel.deleteMany({ where: { taskId } }),
      prisma.taskLabel.createMany({
        data: uniqueIds.map((labelId) => ({ taskId, labelId })),
      }),
    ]);

    await prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action: ActivityType.UPDATED,
        description: labels.length
          ? `Labels set to: ${labels.map((l) => l.name).join(', ')}`
          : 'Removed all labels',
      },
    });

    return labels;
  }
}
