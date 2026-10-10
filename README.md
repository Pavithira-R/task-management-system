# TaskFlow - Task Management System

A production-ready, secure, and feature-rich full-stack Task Management System developed for the **INTE 21323 Web Development Project**. The application enables teams to manage projects, assign tasks, monitor progress, chat in real-time, generate dynamic reports, and collaborate efficiently through a secure web interface.

---

## Features

* **User Authentication & Authorization**: Secure sign-up request flow, login, and JWT-based session management with refresh tokens.
* **Role-Based Access Control (RBAC)**: Fine-grained permissions for `ADMIN`, `PROJECT_MANAGER`, and `COLLABORATOR` roles.
* **Project Management**: Create projects, assign owners, and manage project members.
* **Task Management**: Create, update, filter, prioritize, and assign tasks to collaborators.
* **Deadline Reminders**: Assignees are notified when a task is due within 24 hours; assignees and the task creator are alerted once when it becomes overdue.
* **Real-time Collaboration**: Project-wide instant messaging/chat and real-time live notifications powered by Socket.io.
* **Task Checklists**: Break tasks into subtasks with a progress bar on the task page, task list and Kanban cards.
* **Labels**: Color-coded, project-scoped labels on tasks, with a label filter on the task list.
* **Global Search**: Top-bar search (Ctrl+K) across tasks, projects and comments, limited to what each user can access.
* **Comments & Discussions**: Discuss task progress directly on tasks with support for comment editing/deletion.
* **File Uploads (AWS S3 or local disk)**: Upload, rename, download, and delete task and project attachments securely. Uses S3 when configured, otherwise stores files locally with expiring signed download links.
* **Administrative Audit Logs & Stats**: Access real-time system audit logs, user activation/deactivation controls, role delegation, and sign-up approval requests.
* **Dynamic Reports**: Generate comprehensive status reports with PDF export capability.
* **Docker Containerization**: Pre-configured multi-container Docker Compose setup with Nginx reverse proxy.
* **CI/CD Integration**: Seamless integration with GitHub Actions.

---

## Technology Stack

### Frontend
* **Core**: React 19 (Hooks, Context, Router v7)
* **Build System**: Vite, TypeScript
* **Styling**: Tailwind CSS
* **Networking**: Axios, Socket.io-client

### Backend
* **Runtime & Framework**: Node.js, Express.js (TypeScript)
* **Database Access**: Prisma ORM with PostgreSQL client
* **Security & Auth**: JWT, bcryptjs, Helmet, CORS
* **File Processing**: Multer, AWS SDK for S3 (v3)
* **Real-time Server**: Socket.io

### Database & Cloud Services
* **Database**: PostgreSQL (AWS RDS / Local)
* **Object Storage**: AWS S3 (for attachments)

### DevOps & Deployment
* **Containerization**: Docker, Docker Compose
* **Web Server / Reverse Proxy**: Nginx
* **CI/CD**: GitHub Actions

---

## Project Structure

```text
task-management-system
├── backend
│   ├── prisma                 # Prisma schema & seed data
│   │   ├── migrations/        # Database migrations history
│   │   ├── schema.prisma      # Database models & enums
│   │   └── seed.ts            # Database seeding script
│   ├── src
│   │   ├── config/            # Server, S3, & Database configurations
│   │   ├── controllers/       # Request handlers & logic
│   │   ├── middlewares/       # Authentication, RBAC, and error handlers
│   │   ├── routes/            # Express route declarations
│   │   ├── services/          # Core business & database services
│   │   ├── templates/         # Email HTML templates
│   │   ├── tests/             # RBAC & security test suites
│   │   ├── types/             # TypeScript custom declarations
│   │   ├── utils/             # Helper utility functions
│   │   └── server.ts          # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend
│   ├── src
│   │   ├── components/        # Shared layout & UI components
│   │   ├── pages/             # Dashboard, login, project, & task pages
│   │   ├── routes/            # Application router paths
│   │   └── services/          # API & WebSocket client layers
│   ├── Dockerfile
│   ├── nginx.conf             # Production Nginx frontend routing config
│   └── package.json
│
├── docker-compose.yml         # Development & production container orchestration
└── README.md                  # System documentation
```

---

## Prerequisites

Ensure you have the following installed locally:
* **Node.js 20+**
* **npm**
* **Docker Desktop** (or Docker Engine + Docker Compose)
* **PostgreSQL 15+** (if running locally without Docker)

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/<username>/task-management-system.git
cd task-management-system
```

### 2. Configure Environment Variables
Create a `.env` file inside the `backend` directory. Refer to the table below for configuration details:

```env
PORT=5000
NODE_ENV=development

# Database connection URL
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/task_management?schema=public"

# Auth configurations
JWT_SECRET="your_long_jwt_secret_here"
JWT_REFRESH_SECRET="your_long_refresh_secret_here"

# SMTP configurations (optional - for email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=example@gmail.com
SMTP_PASS="your_app_password"
SMTP_FROM="TMS <example@gmail.com>"

# AWS S3 configurations (optional - for file uploads)
# Leave these out to store attachments on local disk in backend/uploads
# (override the folder with UPLOAD_DIR). Set all four to use S3 instead.
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 3. Install Dependencies
Run npm install in both workspaces:

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 4. Setup the Database
Generate the Prisma client and apply migrations:
```bash
cd ../backend
npx prisma migrate dev
npx prisma db seed
```

---

## Running the Application

### Local Development Mode
Start the backend and frontend development servers concurrently:

```bash
# Terminal 1: Run Backend (starts on port 5000)
cd backend
npm run dev

# Terminal 2: Run Frontend (starts on port 5173)
cd frontend
npm run dev
```

Visit the application at `http://localhost:5173`.  
Access the Swagger interactive API docs at `http://localhost:5000/api-docs` (when backend is running).

---

## API Reference

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Request registration / sign up | Public |
| `POST` | `/api/auth/login` | Login and receive JWT access/refresh token | Public |
| `POST` | `/api/auth/logout` | Logout user session | Public |
| `POST` | `/api/auth/forgot-password` | Send password reset OTP email | Public |
| `POST` | `/api/auth/verify-otp` | Verify password reset OTP code | Public |
| `POST` | `/api/auth/reset-password` | Reset password using verified OTP | Public |
| `POST` | `/api/auth/refresh-token` | Renew expired access token | Public |
| `GET` | `/api/auth/me` | Fetch active user profile details | Authenticated |
| `PUT` | `/api/auth/profile` | Update current user profile details | Authenticated |
| `PUT` | `/api/auth/change-password` | Change user password | Authenticated |
| `POST` | `/api/auth/first-login-reset` | Enforce password reset on first login | Authenticated |

### 2. User & Admin Management (`/api/admin/users`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/users` | Search active collaborators in the system | Admin, PM |
| `GET` | `/api/admin/users` | List all registered users (search/filter) | Admin only |
| `POST` | `/api/admin/users` | Create user directly as administrator | Admin only |
| `GET` | `/api/admin/users/:id` | Fetch specific user details | Admin only |
| `PATCH` | `/api/admin/users/:id/activate` | Activate a deactivated account | Admin only |
| `PATCH` | `/api/admin/users/:id/deactivate` | Deactivate/suspend a user account | Admin only |
| `PATCH` | `/api/admin/users/:id/role` | Update user role (`ADMIN`, `PROJECT_MANAGER`, `COLLABORATOR`) | Admin only |

### 3. Project Management (`/api/projects`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/projects` | List all projects (Admin reads all; PM/Collab reads member-based) | Authenticated |
| `POST` | `/api/projects` | Create a new project | Project Manager |
| `GET` | `/api/projects/:id` | Fetch specific project details | Project Members / Admin |
| `PATCH` | `/api/projects/:id` | Modify project metadata | Project Owner (PM) |
| `DELETE` | `/api/projects/:id` | Delete project | Admin only |
| `POST` | `/api/projects/:id/members` | Add user to project membership | Project Manager |
| `DELETE` | `/api/projects/:id/members/:memberId` | Remove member from project | Project Manager |
| `GET` | `/api/projects/:id/tasks` | Get all tasks belonging to project | Project Members / Admin |

### 4. Task Management (`/api/tasks`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/tasks` | List all tasks | Authenticated |
| `POST` | `/api/tasks` | Create a task under a project | Project Manager |
| `GET` | `/api/tasks/filter` | Query & filter tasks by status/priority | Authenticated |
| `GET` | `/api/tasks/collaborators`| Get list of active collaborators | Project Manager |
| `GET` | `/api/tasks/:id` | Fetch specific task details | Authenticated |
| `PUT` | `/api/tasks/:id` | Update task details (title, assignee, etc.) | Project Manager |
| `DELETE` | `/api/tasks/:id` | Delete task | Project Manager |
| `PATCH` | `/api/tasks/:id/status` | Update task status (`TODO`, `IN_PROGRESS`, `COMPLETED`) | Assigned Collaborator / PM |
| `PATCH` | `/api/tasks/:id/priority`| Update task priority (`LOW`, `MEDIUM`, `HIGH`) | Project Manager |

### 5. Task Comments (`/api/tasks/:id/comments` & `/api/comments`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/tasks/:id/comments` | Get all comments under a task | Authenticated |
| `POST` | `/api/tasks/:id/comments` | Post a new comment on a task | Authenticated |
| `PUT` | `/api/comments/:id` | Edit an existing comment content | Comment Author / PM |
| `PATCH` | `/api/comments/:id` | Partial edit comment content | Comment Author / PM |
| `DELETE` | `/api/comments/:id` | Delete comment | Comment Author / PM |

### 5b. Task Checklists (`/api/tasks/:id/subtasks` & `/api/subtasks`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/tasks/:id/subtasks` | Get the checklist items of a task | Project Members / Admin |
| `POST` | `/api/tasks/:id/subtasks` | Add a checklist item | Project PM / Assigned Collaborator |
| `PATCH` | `/api/subtasks/:id` | Rename or tick/untick a checklist item (`title`, `isCompleted`) | Project PM / Assigned Collaborator |
| `DELETE` | `/api/subtasks/:id` | Delete a checklist item | Project PM / Assigned Collaborator |

### 5c. Labels (`/api/projects/:id/labels`, `/api/labels` & `/api/tasks/:id/labels`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/projects/:id/labels` | List a project's labels (with usage counts) | Project Members / Admin |
| `POST` | `/api/projects/:id/labels` | Create a label (`name`, optional hex `color`) | Project PM |
| `PATCH` | `/api/labels/:id` | Rename or recolor a label | Project PM |
| `DELETE` | `/api/labels/:id` | Delete a label and remove it from all tasks | Project PM |
| `PUT` | `/api/tasks/:id/labels` | Replace a task's labels (`labelIds: number[]`) | Project PM |

`GET /api/tasks/filter` also accepts `labelId`.

### 5d. Global Search (`/api/search`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/search?q=term` | Search tasks, projects and comments the user can access (people too, for admins). `q` needs at least 2 characters | Authenticated |

### 6. File Attachments (`/api/tasks` & `/api/projects` & `/api/attachments`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/tasks/:id/attachments` | Upload file attachment to Task (AWS S3) | Authenticated |
| `GET` | `/api/tasks/:id/attachments` | Get list of attachments on a task | Authenticated |
| `POST` | `/api/projects/:id/attachments`| Upload file attachment to Project (AWS S3) | Authenticated |
| `GET` | `/api/projects/:id/attachments`| Get list of attachments on a project | Authenticated |
| `GET` | `/api/attachments/:id/download`| Fetch pre-signed AWS S3 download link | Authenticated |
| `PATCH` | `/api/attachments/:id/rename`| Rename uploaded file attachment | Authenticated |
| `DELETE` | `/api/attachments/:id` | Delete attachment from database & S3 | Authenticated |

### 7. Notifications (`/api/notifications`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/notifications` | Fetch notifications for current user | Authenticated |
| `GET` | `/api/notifications/unread-count`| Fetch unread notification counts | Authenticated |
| `PATCH` | `/api/notifications/read-all`| Mark all notifications as read | Authenticated |
| `PATCH` | `/api/notifications/:id/read` | Mark single notification as read | Authenticated |
| `DELETE` | `/api/notifications/:id` | Delete notification | Authenticated |

### 8. Registration Requests (`/api/admin/requests`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/requests` | List pending registrations | Admin only |
| `POST` | `/api/admin/requests/:id/approve`| Approve registration and activate user | Admin only |
| `POST` | `/api/admin/requests/:id/reject`| Reject registration | Admin only |

### 9. System Logs & Stats (`/api/admin/logs`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/logs` | Fetch system audit/activity logs | Admin only |
| `GET` | `/api/admin/logs/stats` | Fetch general dashboard summary statistics | Admin only |

### 10. Real-time Project Chat (`/api/messages`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/messages/:projectId` | Retrieve message history for project chat | Project Member |

### 11. Reports (`/api/reports`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/reports/generate` | Generate dynamic report with PDF export option | Admin only |

---

## Docker Deployment

Build and start the application as containerized services (Backend + Frontend + Nginx reverse proxy):

Build the containers:
```bash
docker compose build
```

Start the containers in detached mode:
```bash
docker compose up -d
```

View service logs:
```bash
docker compose logs -f
```

Stop and remove containerized services:
```bash
docker compose down
```

---

## Testing

Run the automated integration and security (RBAC/BOLA/IDOR protection) tests:

```bash
cd backend
npx ts-node src/tests/audit-fixes.test.ts
npx ts-node src/tests/rbac-security.test.ts
```

---

## CI/CD Pipeline

The project implements CI/CD utilizing **GitHub Actions**:
```text
Developer  ──>  Git Push  ──>  GitHub Actions Pipeline  ──>  SSH Deploy to AWS EC2  ──>  Docker Compose Build & Container Restart
```

---

## License

This project was developed for academic purposes as part of the University Web Development Module.
