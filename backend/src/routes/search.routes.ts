import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateUser as any);

// GET /api/search?q=term → tasks, projects and comments the user can access (plus people for admins)
router.get('/', checkRole([Role.ADMIN, Role.PROJECT_MANAGER, Role.COLLABORATOR]) as any, SearchController.search as any);

export default router;
