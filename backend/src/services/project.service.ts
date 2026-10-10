import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { ProjectStatus, ProjectRole, Role } from '@prisma/client';
import { SocketService } from './socket.service';


export class ProjectService {
  // ─── CREATE PROJECT ──────────────────────────────────
  public static async createProject(data: {
    name: string;
    description?: string;
    ownerId: number;
    startDate?: string;
    endDate?: string;
  }) {
    if (!data.name || data.name.trim().length < 3) {
      throw new AppError('Project name must be at least 3 characters long', 400);
    }

    const project = await prisma.project.create({
      data: {
        name: data.name.trim(),
        description: data.description,
        ownerId: data.ownerId,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: ProjectStatus.ACTIVE,
      },
    });

    // Automatically make the creator an owner/manager member in ProjectMember list
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: data.ownerId,
        role: ProjectRole.PROJECT_MANAGER,
      },
    });



    // Notify all ADMIN users
    try {
      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
      for (const admin of admins) {
        if (admin.id !== data.ownerId) {
          await SocketService.sendNotification(admin.id, {
            message: `Project "${project.name}" was created`,
            type: 'PROJECT_CREATED',
          });
        }
      }
    } catch (err) {
      console.error('[Notification Error] Failed to notify admins about project creation:', err);
    }

    return project;
  }

  // ─── GET ALL PROJECTS ────────────────────────────────
  public static async getAllProjects(userId: number, userRole: Role) {
    if (userRole === Role.ADMIN || userRole === Role.PROJECT_MANAGER) {
      return prisma.project.findMany({
        where: { isDeleted: false },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: { include: { user: { select: { id: true, name: true, email: true, status: true } } } },
        },
      });
    }

    // PM can see projects they created OR are members of. Collaborators see projects they are members of.
    return prisma.project.findMany({
      where: {
        isDeleted: false,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, status: true } } } },
      },
    });
  }

  // ─── GET PROJECT BY ID & CALCULATE METRICS ───────────
  public static async getProjectById(projectId: number, userId: number, userRole: Role) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, isDeleted: false },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, status: true } } } },
        tasks: {
          include: {
            assignees: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found or deleted', 404);
    }

    // Guard access: Administrator, Owner, or Member only
    const isMember = project.members.some((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    if (userRole !== Role.ADMIN && !isOwner && !isMember) {
      throw new AppError('Access forbidden to this project', 403);
    }

    // Analytics calculations
    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const pendingTasks = tasks.filter((t) => t.status === 'TODO').length;
    
    const now = new Date();
    const overdueTasks = tasks.filter((t) => {
      return t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < now;
    }).length;

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        owner: project.owner,
        members: project.members,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      analytics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        completionPercentage,
      },
    };
  }

  // ─── UPDATE PROJECT (WITH OWNERSHIP CHECK) ───────────
  public static async updateProject(
    projectId: number,
    data: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      startDate?: string;
      endDate?: string;
    },
    userId: number,
    userRole: Role
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.isDeleted) {
      throw new AppError('Project not found', 404);
    }

    // Strict Ownership Enforcement: PM Owner only (Admin is read-only)
    if (project.ownerId !== userId || userRole !== Role.PROJECT_MANAGER) {
      throw new AppError('Only the project creator can modify this project', 403);
    }

    if (data.name && data.name.trim().length < 3) {
      throw new AppError('Project name must be at least 3 characters long', 400);
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name?.trim(),
        description: data.description,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    // Notify all members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    for (const member of members) {
      if (member.userId !== userId) {
        await SocketService.sendNotification(member.userId, {
          message: data.status === 'ARCHIVED' 
            ? `Project "${updatedProject.name}" was archived`
            : data.status === 'COMPLETED'
            ? `Project "${updatedProject.name}" was marked as completed`
            : `Project "${updatedProject.name}" was updated`,
          type: 'PROJECT_UPDATED',
        });
      }
    }

    return updatedProject;
  }

  // ─── DELETE PROJECT ────────────────────────
  public static async deleteProject(projectId: number, userId: number, userRole: Role) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.isDeleted) {
      throw new AppError('Project not found', 404);
    }

    if (project.ownerId !== userId || userRole !== Role.PROJECT_MANAGER) {
      throw new AppError('Only the project creator can delete this project', 403);
    }

    // Soft delete the project to preserve audit trail and avoid FK constraint errors
    await prisma.project.update({ 
      where: { id: projectId },
      data: { isDeleted: true }
    });

    // Notify all ADMIN users
    try {
      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
      for (const admin of admins) {
        if (admin.id !== userId) {
          await SocketService.sendNotification(admin.id, {
            message: `Project "${project.name}" was deleted by ${userRole}`,
            type: 'PROJECT_DELETED',
          });
        }
      }
    } catch (err) {
      console.error('[Notification Error] Failed to notify admins about project deletion:', err);
    }
  }

  // ─── ADD PROJECT MEMBER ──────────────────────────────
  public static async addProjectMember(
    projectId: number,
    userIdToLink: number,
    role: ProjectRole,
    userId: number,
    userRole: Role
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.isDeleted) {
      throw new AppError('Project not found', 404);
    }

    if (project.ownerId !== userId || userRole !== Role.PROJECT_MANAGER) {
      throw new AppError('Only the project creator can manage members', 403);
    }

    // Verify user to add exists
    const targetUser = await prisma.user.findUnique({ where: { id: userIdToLink } });
    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    const projectMember = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: userIdToLink,
        },
      },
      update: { role },
      create: {
        projectId,
        userId: userIdToLink,
        role,
      },
    });

    // Notify the added member
    await SocketService.sendNotification(userIdToLink, {
      message: `You have been added to project "${project.name}"`,
      type: 'PROJECT_MEMBER_ADDED',
    });

    // Notify ALL OTHER members about the new collaborator
    try {
      const allMembers = await prisma.projectMember.findMany({ where: { projectId } });
      for (const m of allMembers) {
        if (m.userId !== userIdToLink && m.userId !== userId) {
          await SocketService.sendNotification(m.userId, {
            message: `${targetUser.name} has joined the project "${project.name}"`,
            type: 'PROJECT_UPDATED',
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify team of new member:', notifErr);
    }

    // Send an automatic welcome message in the project chat
    try {
      const welcomeMessage = await prisma.message.create({
        data: {
          projectId,
          senderId: userId,
          content: `Welcome to the team, ${targetUser.name}! Let's do great work together! 🚀`
        },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } }
        }
      });
      SocketService.broadcastToProject(projectId, 'receiveMessage', welcomeMessage);
    } catch (msgErr) {
      console.error('Failed to send welcome message:', msgErr);
    }

    return projectMember;
  }

  // ─── REMOVE PROJECT MEMBER ───────────────────────────
  public static async removeProjectMember(
    projectId: number,
    memberIdToRemove: number,
    userId: number,
    userRole: Role
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.isDeleted) {
      throw new AppError('Project not found', 404);
    }

    if (project.ownerId !== userId || userRole !== Role.PROJECT_MANAGER) {
      throw new AppError('Only the project creator can manage members', 403);
    }

    const member = await prisma.projectMember.findFirst({
      where: { id: memberIdToRemove, projectId },
      include: { user: true },
    });

    if (!member) {
      throw new AppError('Member not found in this project', 404);
    }

    // Cannot remove the project owner from members list
    if (member.userId === project.ownerId) {
      throw new AppError('Cannot remove the project owner from project members', 400);
    }

    const deletedMember = await prisma.projectMember.delete({
      where: { id: memberIdToRemove },
    });

    // Notify the removed member
    await SocketService.sendNotification(deletedMember.userId, {
      message: `You have been removed from project "${project.name}"`,
      type: 'PROJECT_UPDATED',
    });

    // Notify ALL OTHER members about the removed collaborator
    try {
      const remainingMembers = await prisma.projectMember.findMany({ where: { projectId } });
      for (const m of remainingMembers) {
        if (m.userId !== userId) {
          await SocketService.sendNotification(m.userId, {
            message: `${member.user.name} was removed from the project "${project.name}"`,
            type: 'PROJECT_UPDATED',
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify team of removed member:', notifErr);
    }

    // Send an automatic message in the project chat
    try {
      const removalMessage = await prisma.message.create({
        data: {
          projectId,
          senderId: userId,
          content: `${member.user.name} has been removed from the workspace.`
        },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } }
        }
      });
      SocketService.broadcastToProject(projectId, 'receiveMessage', removalMessage);
    } catch (msgErr) {
      console.error('Failed to send removal message:', msgErr);
    }

    return deletedMember;
  }

  // ─── GET PROJECT TASKS ───────────────────────────────
  public static async getProjectTasks(projectId: number, userId: number, userRole: Role) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project || project.isDeleted) {
      throw new AppError('Project not found', 404);
    }

    const isMember = project.members.some((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    if (userRole !== Role.ADMIN && !isOwner && !isMember) {
      throw new AppError('Access forbidden to this project tasks', 403);
    }

    return prisma.task.findMany({
      where: { projectId },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        creator: { select: { id: true, name: true, email: true } },
        subtasks: { select: { id: true, isCompleted: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
