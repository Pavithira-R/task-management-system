import { Router } from 'express';
import { LabelController } from '../controllers/label.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser as any);
router.use(checkRole([Role.PROJECT_MANAGER]) as any);

router.patch('/:id', LabelController.updateLabel as any);
router.delete('/:id', LabelController.deleteLabel as any);

export default router;
