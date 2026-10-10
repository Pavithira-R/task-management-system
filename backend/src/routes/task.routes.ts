import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { CommentController } from '../controllers/comment.controller';
import { AttachmentController } from '../controllers/attachment.controller';
import { SubtaskController } from '../controllers/subtask.controller';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth to all task routes
router.use(authenticateUser as any);

// ─── Task CRUD Routes ───────────────────────────────

// GET /api/tasks → get all tasks (ADMIN read-all, PM/Collaborator member-based)
router.get('/', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, TaskController.getAllTasks);

// GET /api/tasks/filter → filter tasks
router.get('/filter', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, TaskController.filterTasks);

// POST /api/tasks → create new task (PROJECT_MANAGER only)
router.post('/', checkRole([Role.PROJECT_MANAGER]) as any, TaskController.createTask);

// GET /api/tasks/collaborators → get all active collaborators in the system
router.get('/collaborators', checkRole([Role.PROJECT_MANAGER]) as any, TaskController.getCollaborators);

// GET /api/tasks/:id → get single task
router.get('/:id', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, TaskController.getTaskById);

// PUT /api/tasks/:id → update task (PROJECT_MANAGER only)
router.put('/:id', checkRole([Role.PROJECT_MANAGER]) as any, TaskController.updateTask);

// DELETE /api/tasks/:id → delete task (PROJECT_MANAGER only)
router.delete('/:id', checkRole([Role.PROJECT_MANAGER]) as any, TaskController.deleteTask);

// ─── Extra Task Routes ──────────────────────────────

// PATCH /api/tasks/:id/status → change status (PROJECT_MANAGER, COLLABORATOR)
router.patch('/:id/status', checkRole([Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, TaskController.updateTaskStatus);

// PATCH /api/tasks/:id/priority → change priority (PROJECT_MANAGER only)
router.patch('/:id/priority', checkRole([Role.PROJECT_MANAGER]) as any, TaskController.updateTaskPriority);

// ─── Task Comment Routes ───────────────────────────
router.post('/:id/comments', checkRole([Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, CommentController.addComment);
router.get('/:id/comments', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, CommentController.getCommentsForTask);

// ─── Task Checklist (Subtask) Routes ───────────────
router.get('/:id/subtasks', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, SubtaskController.getSubtasks);
router.post('/:id/subtasks', checkRole([Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, SubtaskController.addSubtask);

// ─── Task Attachment Routes ────────────────────────
router.post('/:id/attachments', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, uploadMiddleware.single('file'), AttachmentController.uploadAttachment);
router.get('/:id/attachments', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, AttachmentController.getTaskAttachments);

export default router;