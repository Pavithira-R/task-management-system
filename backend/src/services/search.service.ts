import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { Prisma, Role } from '@prisma/client';

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const LIMITS = { tasks: 8, projects: 5, comments: 5, people: 5 };

export class SearchService {
  // ─── GLOBAL SEARCH ──────────────────────────────────
  // Searches only what the user can already open: admins see everything,
  // everyone else sees tasks, projects and comments from projects they belong to.
  public static async search(rawQuery: unknown, userId: number, userRole: Role) {
    if (typeof rawQuery !== 'string' || rawQuery.trim().length < MIN_QUERY_LENGTH) {
      throw new AppError(`Search query must be at least ${MIN_QUERY_LENGTH} characters`, 400);
    }
    const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
    const match = { contains: q, mode: Prisma.QueryMode.insensitive };
    const isAdmin = userRole === Role.ADMIN;

    const visibleProject: Prisma.ProjectWhereInput = isAdmin
      ? { isDeleted: false }
      : {
          isDeleted: false,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        };

    const [tasks, projects, comments, people] = await Promise.all([
      prisma.task.findMany({
        where: {
          project: visibleProject,
          OR: [{ title: match }, { description: match }],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: LIMITS.tasks,
      }),

      prisma.project.findMany({
        where: {
          AND: [visibleProject, { OR: [{ name: match }, { description: match }] }],
        },
        select: { id: true, name: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: LIMITS.projects,
      }),

      prisma.comment.findMany({
        where: {
          content: match,
          task: { project: visibleProject },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: LIMITS.comments,
      }),

      isAdmin
        ? prisma.user.findMany({
            where: { OR: [{ name: match }, { email: match }] },
            select: { id: true, name: true, email: true, role: true, status: true },
            orderBy: { name: 'asc' },
            take: LIMITS.people,
          })
        : Promise.resolve([]),
    ]);

    return { query: q, tasks, projects, comments, people };
  }
}
