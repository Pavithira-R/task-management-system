import { Request, Response, NextFunction } from 'express';
import { AttachmentService } from '../services/attachment.service';
import { StorageService } from '../services/storage.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';

export class AttachmentController {
  // POST /api/tasks/:id/attachments
  public static async uploadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        throw new AppError('Invalid task ID', 400);
      }

      if (!req.file) {
        throw new AppError('File upload payload is missing', 400);
      }

      const attachment = await AttachmentService.createAttachment(
        taskId,
        null,
        req.file.originalname,
        req.file.buffer,
        req.file.size,
        req.file.mimetype,
        req.user!.id,
        req.user!.role
      );

      res.status(201).json({
        success: true,
        message: 'Attachment uploaded successfully',
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/:id/attachments
  public static async getTaskAttachments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        throw new AppError('Invalid task ID', 400);
      }

      const attachments = await AttachmentService.getTaskAttachments(taskId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Attachments retrieved successfully',
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/projects/:id/attachments
  public static async uploadProjectAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new AppError('Invalid project ID', 400);
      }

      if (!req.file) {
        throw new AppError('File upload payload is missing', 400);
      }

      const attachment = await AttachmentService.createAttachment(
        null,
        projectId,
        req.file.originalname,
        req.file.buffer,
        req.file.size,
        req.file.mimetype,
        req.user!.id,
        req.user!.role
      );

      res.status(201).json({
        success: true,
        message: 'Attachment uploaded successfully to project',
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/projects/:id/attachments
  public static async getProjectAttachments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new AppError('Invalid project ID', 400);
      }

      const attachments = await AttachmentService.getProjectAttachments(projectId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Project attachments retrieved successfully',
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/attachments/:id
  public static async deleteAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const attachmentId = parseInt(req.params.id);
      if (isNaN(attachmentId)) {
        throw new AppError('Invalid attachment ID', 400);
      }

      await AttachmentService.deleteAttachment(attachmentId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/attachments/:id/download
  public static async downloadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const attachmentId = parseInt(req.params.id);
      if (isNaN(attachmentId)) {
        throw new AppError('Invalid attachment ID', 400);
      }

      const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
      if (!attachment) {
        throw new AppError('Attachment not found', 404);
      }

      // Authorization logic
      if (req.user!.role !== Role.ADMIN) {
        let targetProjectId = attachment.projectId;
        if (attachment.taskId) {
          const task = await prisma.task.findUnique({ where: { id: attachment.taskId } });
          if (!task) {
            throw new AppError('Task associated with this attachment not found', 404);
          }
          targetProjectId = task.projectId;
        }
        
        if (!targetProjectId) {
          throw new AppError('Attachment has no associated task or project', 404);
        }

        const isMember = await prisma.projectMember.findFirst({
          where: {
            projectId: targetProjectId,
            userId: req.user!.id,
          },
        });
        if (!isMember) {
          throw new AppError('Access forbidden: You are not a member of this project', 403);
        }
      }

      // If it is an old file stored on disk
      if (!attachment.storageKey) {
        const fs = require('fs');
        if (!fs.existsSync(attachment.fileUrl)) {
          throw new AppError('File not found on disk', 404);
        }
        res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
        const fileStream = fs.createReadStream(attachment.fileUrl);
        fileStream.pipe(res);
        return;
      }

      // Generate a time-limited download URL (S3 pre-signed or local signed link)
      const downloadUrl = await StorageService.getDownloadUrl(
        attachment.storageKey,
        attachment.filename,
        attachment.mimeType
      );

      // Return URL to client or redirect
      res.status(200).json({
        success: true,
        message: 'Download URL generated successfully',
        data: {
          url: downloadUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/attachments/files/:token (local storage only; the signed token is the authorization)
  public static async serveLocalFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (StorageService.driver !== 'local') {
        throw new AppError('Not found', 404);
      }

      const { filePath, filename, mimeType } = StorageService.resolveDownloadToken(req.params.token);

      res.setHeader('Content-Type', mimeType);
      res.attachment(filename);
      res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) next(err);
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/attachments/:id/rename
  public static async renameAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const attachmentId = parseInt(req.params.id);
      if (isNaN(attachmentId)) {
        throw new AppError('Invalid attachment ID', 400);
      }

      const { filename } = req.body;
      if (!filename || typeof filename !== 'string') {
        throw new AppError('Filename is required and must be a string', 400);
      }

      const updatedAttachment = await AttachmentService.renameAttachment(
        attachmentId,
        filename,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        message: 'Attachment renamed successfully',
        data: updatedAttachment,
      });
    } catch (error) {
      next(error);
    }
  }
}
