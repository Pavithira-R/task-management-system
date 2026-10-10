import { Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { SocketService } from '../services/socket.service';
import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { SystemLogger } from '../utils/logger';

export class TaskController {

  // GET /api/tasks
  public static async getAllTasks(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tasks = await TaskService.getAllTasks(req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Tasks retrieved successfully',
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/collaborators
  public static async getCollaborators(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const collaborators = await prisma.user.findMany({
        where: {
          role: Role.COLLABORATOR,
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        message: 'Collaborators retrieved successfully',
        data: collaborators,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tasks
  public static async createTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { title, description, projectId, priority, dueDate, assigneeIds } = req.body;

      const task = await TaskService.createTask({
        title,
        description,
        projectId: parseInt(projectId),
        priority,
        dueDate,
        creatorId: req.user!.id,
        creatorRole: req.user!.role,
        assigneeIds: assigneeIds ? assigneeIds.map((id: any) => parseInt(id)) : undefined,
      });

      // Audit Log: Task Created
      await SystemLogger.log('TASK_CREATED', `Task "${task.title}" (ID: ${task.id}) created by user ID ${req.user!.id}`);

      // Audit Log: Task Assigned
      if (assigneeIds && assigneeIds.length > 0) {
        await SystemLogger.log('TASK_ASSIGNED', `Task "${task.title}" (ID: ${task.id}) assigned to user IDs: ${assigneeIds.join(', ')}`);
      }

      // 🟢 2. Broadcast that a new task was just created!
      SocketService.broadcast('taskCreated', task);

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/:id
  public static async getTaskById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);

      const task = await TaskService.getTaskById(taskId, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Task retrieved successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/tasks/:id
  public static async updateTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      const { title, description, priority, dueDate, assigneeIds } = req.body;

      const task = await TaskService.updateTask({
        taskId,
        title,
        description,
        priority,
        dueDate,
        userId: req.user!.id,
        userRole: req.user!.role,
        assigneeIds: assigneeIds ? assigneeIds.map((id: any) => parseInt(id)) : undefined,
      });

      // Audit Log: Priority Changed
      if (priority) {
        await SystemLogger.log('PRIORITY_CHANGED', `Task ID ${taskId} priority updated to ${priority} by user ID ${req.user!.id}`);
      }

      // Audit Log: Deadline Changed
      if (dueDate) {
        await SystemLogger.log('DEADLINE_CHANGED', `Task ID ${taskId} deadline updated to ${dueDate} by user ID ${req.user!.id}`);
      }

      // Audit Log: Task Assigned
      if (assigneeIds) {
        await SystemLogger.log('TASK_ASSIGNED', `Task ID ${taskId} assignments updated by user ID ${req.user!.id}`);
      }

      // 🟢 3. Broadcast that this entire task was updated
      SocketService.broadcast('taskUpdated', task);

      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/tasks/:id
  public static async deleteTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);

      await TaskService.deleteTask(taskId, req.user!.id, req.user!.role);

      // Audit Log: Task Deleted
      await SystemLogger.log('TASK_DELETED', `Task ID ${taskId} was deleted by user ID ${req.user!.id}`);

      // 🟢 4. Broadcast the ID of the deleted task so the frontend can remove it from the screen
      SocketService.broadcast('taskDeleted', { taskId });

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tasks/:id/status
  public static async updateTaskStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;

      const task = await TaskService.updateTaskStatus({
        taskId,
        status,
        userId: req.user!.id,
        userRole: req.user!.role,
      });

      // Audit Log: Task Status Updated
      await SystemLogger.log('TASK_STATUS_UPDATED', `Task ID ${taskId} status updated to ${status} by user ID ${req.user!.id}`);

      // 🟢 5. Broadcast the updated task (useful for moving cards on a Kanban board!)
      SocketService.broadcast('taskUpdated', task);

      res.status(200).json({
        success: true,
        message: 'Task status updated successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tasks/:id/priority
  public static async updateTaskPriority(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      const { priority } = req.body;

      const task = await TaskService.updateTaskPriority({
        taskId,
        priority,
        userId: req.user!.id,
        userRole: req.user!.role,
      });

      // Audit Log: Priority Changed
      await SystemLogger.log('PRIORITY_CHANGED', `Task ID ${taskId} priority updated to ${priority} by user ID ${req.user!.id}`);

      // 🟢 6. Broadcast the updated task
      SocketService.broadcast('taskUpdated', task);

      res.status(200).json({
        success: true,
        message: 'Task priority updated successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tasks/filter
  public static async filterTasks(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, priority, projectId, labelId } = req.query;

      const tasks = await TaskService.filterTasks({
        userId: req.user!.id,
        userRole: req.user!.role,
        status: status as string,
        priority: priority as string,
        projectId: projectId ? parseInt(projectId as string) : undefined,
        labelId: labelId ? parseInt(labelId as string) : undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Tasks filtered successfully',
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }
}