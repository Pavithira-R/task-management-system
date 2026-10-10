import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { ActivityType, Role } from '@prisma/client';
import { SocketService } from './socket.service';
import { StorageService } from './storage.service';

export class AttachmentService {
  // ─── CREATE ATTACHMENT RECORD ────────────────────────
  public static async createAttachment(
    taskId: number | null,
    projectId: number | null,
    filename: string,
    fileBuffer: Buffer,
    fileSize: number,
    mimeType: string,
    userId: number,
    userRole: Role
  ) {
    let finalProjectId = projectId;

    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new AppError('Task not found', 404);
      }
      finalProjectId = task.projectId;

      if (userRole === Role.COLLABORATOR) {
        const assignment = await prisma.taskAssignment.findUnique({
          where: { taskId_userId: { taskId, userId } },
        });
        if (!assignment) {
          throw new AppError('Collaborators can only upload attachments to tasks assigned to them', 403);
        }
      } else if (userRole === Role.PROJECT_MANAGER) {
        const isMember = await prisma.projectMember.findFirst({
          where: { projectId: task.projectId, userId }
        });
        if (!isMember) {
          throw new AppError('Access forbidden: You are not a member of this project', 403);
        }
      }
    } else if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        throw new AppError('Project not found', 404);
      }
      const isMember = await prisma.projectMember.findFirst({
        where: { projectId, userId }
      });
      if (!isMember) {

        throw new AppError('Access forbidden: You are not a member of this project', 403);
      }
    } else {
      throw new AppError('Must provide taskId or projectId', 400);
    }

    // Generate storageKey
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = taskId 
      ? `tasks/task_${taskId}/${timestamp}-${safeFilename}`
      : `projects/project_${projectId}/${timestamp}-${safeFilename}`;

    // Upload to S3 or local disk
    await StorageService.uploadFile(fileBuffer, mimeType, storageKey);

    const attachment = await prisma.attachment.create({
      data: {
        filename,
        fileUrl: '', // Keep for backward compatibility or replace entirely if DB schema allowed removing it. We didn't remove it.
        storageKey,
        fileSize,
        mimeType,
        taskId,
        projectId,
        userId,
      },
    });

    if (taskId) {
      // Write audit activity
      await prisma.taskActivity.create({
        data: {
          taskId,
          userId,
          action: ActivityType.UPDATED,
          description: `Uploaded attachment: "${filename}"`,
        },
      });

      // Notify task creator and assignees
      const taskWithUsers = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          creator: true,
          assignees: true,
        },
      });

      if (taskWithUsers) {
        const recipientIds = new Set<number>();
        if (taskWithUsers.creatorId !== userId) {
          recipientIds.add(taskWithUsers.creatorId);
        }
        taskWithUsers.assignees.forEach((a) => {
          if (a.userId !== userId) {
            recipientIds.add(a.userId);
          }
        });

        for (const rId of recipientIds) {
          await SocketService.sendNotification(rId, {
            message: `New attachment uploaded to task "${taskWithUsers.title}": "${filename}"`,
            type: 'ATTACHMENT_ADDED',
            taskId,
          });
        }
      }
    }

    return attachment;
  }

  // ─── GET ATTACHMENTS FOR TASK ────────────────────────
  public static async getTaskAttachments(taskId: number, userId: number, userRole: Role) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    if (userRole !== Role.ADMIN) {
      const isMember = await prisma.projectMember.findFirst({
        where: { projectId: task.projectId, userId }
      });
      if (!isMember) {
        throw new AppError('Access forbidden: You are not a member of this project', 403);
      }
    }

    return prisma.attachment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ─── GET ATTACHMENTS FOR PROJECT ─────────────────────
  public static async getProjectAttachments(projectId: number, userId: number, userRole: Role) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (userRole !== Role.ADMIN) {
      const isMember = await prisma.projectMember.findFirst({
        where: { projectId, userId }
      });
      if (!isMember) {
        throw new AppError('Access forbidden: You are not a member of this project', 403);
      }
    }

    return prisma.attachment.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ─── DELETE ATTACHMENT (DB & FILE SYSTEM) ────────────
  public static async deleteAttachment(attachmentId: number, userId: number, userRole: Role) {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
      throw new AppError('Attachment not found', 404);
    }

    let targetProjectId = attachment.projectId;
    if (attachment.taskId) {
      const task = await prisma.task.findUnique({ where: { id: attachment.taskId } });
      targetProjectId = task?.projectId || targetProjectId;
    }

    const project = targetProjectId ? await prisma.project.findUnique({ where: { id: targetProjectId } }) : null;

    const isUploader = attachment.userId === userId;
    const isProjectOwnerPM = project && project.ownerId === userId && userRole === Role.PROJECT_MANAGER;

    if (!isUploader && !isProjectOwnerPM && userRole !== Role.ADMIN) {
      throw new AppError('You do not have permission to delete this attachment', 403);
    }

    if (attachment.storageKey) {
      await StorageService.deleteFile(attachment.storageKey);
    } else {
      // Backward compatibility for old disk files
      const fs = require('fs');
      if (fs.existsSync(attachment.fileUrl)) {
        try {
          fs.unlinkSync(attachment.fileUrl);
        } catch (err) {
          console.error('Failed to delete physical file:', err);
        }
      }
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });

    if (attachment.taskId) {
      await prisma.taskActivity.create({
        data: {
          taskId: attachment.taskId,
          userId,
          action: ActivityType.DELETED,
          description: `Deleted attachment: "${attachment.filename}"`,
        },
      });
    }
  }

  // ─── RENAME ATTACHMENT ───────────────────────────────
  public static async renameAttachment(attachmentId: number, newFilename: string, userId: number, userRole: Role) {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
      throw new AppError('Attachment not found', 404);
    }

    let targetProjectId = attachment.projectId;
    if (attachment.taskId) {
      const task = await prisma.task.findUnique({ where: { id: attachment.taskId } });
      targetProjectId = task?.projectId || targetProjectId;
    }

    const project = targetProjectId ? await prisma.project.findUnique({ where: { id: targetProjectId } }) : null;

    const isUploader = attachment.userId === userId;
    const isProjectOwnerPM = project && project.ownerId === userId && userRole === Role.PROJECT_MANAGER;

    if (!isUploader && !isProjectOwnerPM && userRole !== Role.ADMIN) {
      throw new AppError('You do not have permission to rename this attachment', 403);
    }

    const updatedAttachment = await prisma.attachment.update({
      where: { id: attachmentId },
      data: { filename: newFilename },
    });

    if (attachment.taskId) {
      await prisma.taskActivity.create({
        data: {
          taskId: attachment.taskId,
          userId,
          action: ActivityType.UPDATED,
          description: `Renamed attachment from "${attachment.filename}" to "${newFilename}"`,
        },
      });
    }

    return updatedAttachment;
  }
}
