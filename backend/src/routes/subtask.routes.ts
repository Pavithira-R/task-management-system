import { Router } from 'express';
import { SubtaskController } from '../controllers/subtask.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser as any);
router.use(checkRole([Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any);

router.patch('/:id', SubtaskController.updateSubtask as any);
router.delete('/:id', SubtaskController.deleteSubtask as any);

export default router;
