import { Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class SearchController {
  // GET /api/search?q=term
  public static async search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await SearchService.search(req.query.q, req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
}
