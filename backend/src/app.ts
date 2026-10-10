import express, { Application } from 'express';

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Existing Route Imports
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import generalUserRoutes from './routes/general-user.routes';
import attachmentRoutes from './routes/attachment.routes';
import commentRoutes from './routes/comment.routes';
import notificationRoutes from './routes/notification.routes';
import requestRoutes from './routes/request.routes';
import logRoutes from './routes/log.routes';
import messageRoutes from './routes/message.routes';
import reportRoutes from './routes/report.routes';
import subtaskRoutes from './routes/subtask.routes';
import labelRoutes from './routes/label.routes';
import searchRoutes from './routes/search.routes';

import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app: Application = express();

// Swagger Documentation (Must be before Helmet to prevent CSP issues)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js'
  ]
}));

// Security Middlewares
app.use(helmet());
app.use(cors());

// Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use(morgan('dev'));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/requests', requestRoutes);
app.use('/api/admin/logs', logRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', generalUserRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);

// Handle 404
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;