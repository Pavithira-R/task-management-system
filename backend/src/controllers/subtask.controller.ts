import { Response, NextFunction } from 'express';
import { SubtaskService } from '../services/subtask.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/AppError';

export class SubtaskController {
  // GET /api/tasks/:id/subtasks
  public static async getSubtasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        throw new AppError('Invalid task ID', 400);
      }

      const subtasks = await SubtaskService.getSubtasks(taskId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Checklist retrieved successfully',
        data: subtasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tasks/:id/subtasks
  public static async addSubtask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        throw new AppError('Invalid task ID', 400);
      }

      const subtask = await SubtaskService.addSubtask(taskId, req.body.title, req.user!.id, req.user!.role);

      res.status(201).json({
        success: true,
        message: 'Checklist item added successfully',
        data: subtask,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/subtasks/:id
  public static async updateSubtask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subtaskId = parseInt(req.params.id);
      if (isNaN(subtaskId)) {
        throw new AppError('Invalid checklist item ID', 400);
      }

      const { title, isCompleted } = req.body;
      const subtask = await SubtaskService.updateSubtask(
        subtaskId,
        { title, isCompleted },
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        message: 'Checklist item updated successfully',
        data: subtask,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/subtasks/:id
  public static async deleteSubtask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subtaskId = parseInt(req.params.id);
      if (isNaN(subtaskId)) {
        throw new AppError('Invalid checklist item ID', 400);
      }

      await SubtaskService.deleteSubtask(subtaskId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Checklist item deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
