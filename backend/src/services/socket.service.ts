import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';

export class SocketService {
  private static io: SocketIOServer | null = null;
  // userId -> Set of socketIds (to support multiple tabs/connections)
  private static userSockets = new Map<number, Set<string>>();

  public static init(server: http.Server): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // Allows frontend development connections
        methods: ['GET', 'POST'],
      },
    });

    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
          return next(new Error('Authentication token missing'));
        }

        const decoded = verifyToken(token as string);
        if (!decoded || !decoded.userId) {
          return next(new Error('Invalid token payload'));
        }

        const user = await prisma.user.findUnique({
          where: { id: Number(decoded.userId) },
          select: { status: true },
        });

        if (!user || user.status !== 'ACTIVE') {
          return next(new Error('User account is deactivated or not found'));
        }

        socket.data = { userId: Number(decoded.userId) };
        next();
      } catch (error) {
        return next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      console.log(`[WS] User ${userId} connected via socket ${socket.id}`);

      socket.on('disconnect', () => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        console.log(`[WS] User ${userId} disconnected from socket ${socket.id}`);
      });

      // --- Messaging System ---
      socket.on('joinProject', (projectId: string | number) => {
        socket.join(`project_${projectId}`);
        console.log(`[WS] User ${userId} joined project_${projectId}`);
      });

      socket.on('leaveProject', (projectId: string | number) => {
        socket.leave(`project_${projectId}`);
        console.log(`[WS] User ${userId} left project_${projectId}`);
      });

      socket.on('sendMessage', async (data: { projectId: number, content: string }) => {
        try {
          // Verify user access (simplistic for socket, controller handles initial auth)
          // Save message to DB
          const savedMessage = await prisma.message.create({
            data: {
              projectId: data.projectId,
              senderId: userId,
              content: data.content
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          });

          // Broadcast to the project room
          this.io?.to(`project_${data.projectId}`).emit('receiveMessage', savedMessage);
        } catch (error) {
          console.error('[WS-MESSAGE] Error saving/sending message:', error);
        }
      });
    });

    // Start background check for approaching deadlines
    this.startDeadlineCheck();

    return this.io;
  }

  public static emitToUser(userId: number, event: string, data: any): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && this.io) {
      for (const socketId of socketIds) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  public static emitToUsers(userIds: number[], event: string, data: any): void {
    userIds.forEach(userId => this.emitToUser(userId, event, data));
  }

  public static broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  public static broadcastToProject(projectId: number | string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`project_${projectId}`).emit(event, data);
    }
  }

  public static disconnectUser(userId: number): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && this.io) {
      for (const socketId of socketIds) {
        const socketObj = this.io.sockets.sockets.get(socketId);
        if (socketObj) {
          socketObj.disconnect(true);
        }
      }
      this.userSockets.delete(userId);
      console.log(`[WS] Terminated active socket connections for suspended user ID ${userId}`);
    }
  }

  /**
   * Helper to create a notification in DB and emit it via WS if user is online.
   */
  public static async sendNotification(
    userId: number,
    data: {
      message: string;
      type: string; // The specific action type (e.g. PROJECT_CREATED)
      taskId?: number;
    }
  ) {
    // Map custom type to prisma schema NotificationType
    let dbType: NotificationType = NotificationType.ADMIN_UPDATE;
    
    if (data.type === 'TASK_ASSIGNED') {
      dbType = NotificationType.TASK_ASSIGNED;
    } else if (data.type === 'TASK_STATUS_CHANGED' || data.type === 'STATUS_CHANGED') {
      dbType = NotificationType.STATUS_CHANGED;
    } else if (data.type === 'COMMENT_ADDED') {
      dbType = NotificationType.COMMENT_ADDED;
    } else if (data.type === 'DEADLINE_APPROACHING' || data.type === 'DEADLINE_ALERT') {
      dbType = NotificationType.DEADLINE_ALERT;
    }

    // 1. Create in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        message: data.message,
        type: dbType,
        taskId: data.taskId,
      },
    });

    // 2. Emit via WS, including the detailed action type
    const livePayload = {
      ...notification,
      originalType: data.type, // Pass the detailed notification type
    };

    this.emitToUser(userId, 'notification', livePayload);

    return notification;
  }

  /**
   * Periodically checks deadlines of active tasks in live projects:
   * - due in the next 24 hours → DEADLINE_APPROACHING for assigned users
   * - past due → one "Overdue" alert per deadline for assignees and the task creator
   */
  private static startDeadlineCheck(): void {
    // Run checking routine every 1 hour in development
    const checkInterval = 60 * 60 * 1000;

    const checkDeadlines = async () => {
      try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const approachingTasks = await prisma.task.findMany({
          where: {
            status: { not: 'COMPLETED' },
            project: { isDeleted: false },
            dueDate: {
              gt: now,
              lte: tomorrow,
            },
          },
          include: {
            assignees: true,
          },
        });

        for (const task of approachingTasks) {
          for (const assignment of task.assignees) {
            // Check if user was already alerted for this task within the last 24h
            const existingAlert = await prisma.notification.findFirst({
              where: {
                userId: assignment.userId,
                taskId: task.id,
                type: NotificationType.DEADLINE_ALERT,
                createdAt: {
                  gt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                },
              },
            });

            if (!existingAlert) {
              await this.sendNotification(assignment.userId, {
                message: `Deadline approaching: task "${task.title}" is due soon (${task.dueDate?.toLocaleDateString()})`,
                type: 'DEADLINE_APPROACHING',
                taskId: task.id,
              });
            }
          }
        }

        const overdueTasks = await prisma.task.findMany({
          where: {
            status: { not: 'COMPLETED' },
            project: { isDeleted: false },
            dueDate: { lt: now },
          },
          include: {
            assignees: true,
          },
        });

        for (const task of overdueTasks) {
          const recipientIds = new Set<number>([task.creatorId, ...task.assignees.map((a) => a.userId)]);

          for (const userId of recipientIds) {
            // Alert once per deadline: an alert sent after the current due date means this one was already reported
            const existingAlert = await prisma.notification.findFirst({
              where: {
                userId,
                taskId: task.id,
                type: NotificationType.DEADLINE_ALERT,
                message: { startsWith: 'Overdue:' },
                createdAt: { gt: task.dueDate! },
              },
            });

            if (!existingAlert) {
              await this.sendNotification(userId, {
                message: `Overdue: task "${task.title}" was due ${task.dueDate!.toLocaleDateString()} and is not completed`,
                type: 'DEADLINE_ALERT',
                taskId: task.id,
              });
            }
          }
        }
      } catch (error) {
        console.error('[WS-DEADLINE-CHECK] Error:', error);
      }
    };

    // Run once immediately, then every hour
    checkDeadlines();
    setInterval(checkDeadlines, checkInterval);
  }
}
