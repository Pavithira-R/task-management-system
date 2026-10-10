import { Response, NextFunction } from 'express';
import { LabelService } from '../services/label.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/AppError';

const parseId = (value: string, name: string): number => {
  const id = parseInt(value);
  if (isNaN(id)) {
    throw new AppError(`Invalid ${name} ID`, 400);
  }
  return id;
};

export class LabelController {
  // GET /api/projects/:id/labels
  public static async getProjectLabels(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseId(req.params.id, 'project');
      const labels = await LabelService.getProjectLabels(projectId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Labels retrieved successfully',
        data: labels,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/projects/:id/labels
  public static async createLabel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = parseId(req.params.id, 'project');
      const { name, color } = req.body;
      const label = await LabelService.createLabel(projectId, { name, color }, req.user!.id, req.user!.role);

      res.status(201).json({
        success: true,
        message: 'Label created successfully',
        data: label,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/labels/:id
  public static async updateLabel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const labelId = parseId(req.params.id, 'label');
      const { name, color } = req.body;
      const label = await LabelService.updateLabel(labelId, { name, color }, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Label updated successfully',
        data: label,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/labels/:id
  public static async deleteLabel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const labelId = parseId(req.params.id, 'label');
      await LabelService.deleteLabel(labelId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Label deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/tasks/:id/labels
  public static async setTaskLabels(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = parseId(req.params.id, 'task');
      const labels = await LabelService.setTaskLabels(taskId, req.body.labelIds, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Task labels updated successfully',
        data: labels,
      });
    } catch (error) {
      next(error);
    }
  }
}
