# HireFlow

HireFlow is a full-stack ATS-style hiring platform built with React, Express, and MongoDB. It helps internal HR teams manage jobs, candidates, interviews, pipeline movement, dashboards, analytics, and admin-controlled user access.

This repo currently contains:
- `Client/` - Vite + React frontend
- `Server/` - Express + MongoDB backend

## What HireFlow Does

Internal users can:
- log in with organization-provided credentials
- manage jobs and candidates
- move candidates through a hiring pipeline
- schedule interviews and record feedback
- view an operational dashboard
- view analytics dashboards
- manage users from an admin-only team page

Public candidates can:
- apply to a job through `/apply/:jobId`
- track application status through `/status/:token`

Candidates are not app users. They do not sign up or log in.

## Current Feature Set

### Authentication
- JWT access token + refresh token flow
- role-based access: `admin`, `recruiter`, `viewer`
- profile page backed by `/api/auth/me`
- admin-created users only
- public registration disabled after initial bootstrap

### Jobs
- create, edit, archive, and view jobs
- public job application entry point
- filtering and job detail flows

### Candidates
- candidate list with filters
- candidate detail view
- notes, stage history, recruiter assignment
- AI score display if available
- duplicate candidate detection

### Pipeline
- real candidate pipeline grouped by stage
- drag-and-drop stage movement
- optimistic UI updates with rollback on failure

### Interviews
- interview scheduling
- calendar/list views
- feedback capture
- upcoming interview tracking

### Dashboard
- real operational overview for day-to-day HR activity
- recent applications
- upcoming interviews
- active jobs
- pipeline summary
- recent activity

### Analytics
- KPI overview
- pipeline stage chart
- source breakdown
- time-to-hire chart
- upcoming interviews widget

### Admin
- team/user management page
- create users
- update roles
- settings page for workspace-level preferences

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Axios
- React Query
- Zustand
- Recharts
- Tiptap
- Framer Motion

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcrypt
- Zod

## Project Structure

```text
Hireflow/
  Client/
    src/
      components/
      features/
      pages/
  Server/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      utils/
    scripts/
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- MongoDB connection string

### 1. Install dependencies

Frontend:

```bash
cd Client
npm install
```

Backend:

```bash
cd Server
npm install
```

### 2. Configure backend environment

Create `Server/.env` with values like:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:8080
COOKIE_SECURE=false

FIRST_ADMIN_NAME=HireFlow Admin
FIRST_ADMIN_EMAIL=admin@example.com
FIRST_ADMIN_PASSWORD=ChangeMe123
```

### 3. Create the first admin

HireFlow uses admin-created internal users. Public signup is intentionally disabled after the first bootstrap.

Run:

```bash
cd Server
npm run seed:admin
```

This creates the first admin from:
- `FIRST_ADMIN_NAME`
- `FIRST_ADMIN_EMAIL`
- `FIRST_ADMIN_PASSWORD`

### 4. Start the backend

```bash
cd Server
npm run dev
```

### 5. Start the frontend

```bash
cd Client
npm run dev
```

Frontend default:
- `http://localhost:8080`

Backend default:
- `http://localhost:5000`

## Available Scripts

### Client

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

### Server

```bash
npm run dev
npm run start
npm run seed:admin
```

## Auth and Access Model

### Internal users
- `admin`
  - full access
  - can manage users
  - can access settings
- `recruiter`
  - can manage jobs, candidates, interviews
  - can access analytics
- `viewer`
  - read-only dashboard and internal views

### Candidate access
- no login
- no dashboard access
- public apply page only
- public status page only

### Registration policy
- no public signup in frontend
- `/api/auth/register` only works when there are zero users in the database
- after that, user creation happens through admin-only `POST /api/users`

## Main Routes

### Public frontend routes
- `/`
- `/login`
- `/apply/:jobId`
- `/status/:token`

### Internal frontend routes
- `/dashboard`
- `/profile`
- `/jobs`
- `/candidates`
- `/pipeline`
- `/interviews`
- `/analytics`
- `/users`
- `/settings`

## Key API Areas

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`

### Users
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id/role`

### Jobs
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/jobs`
- `PATCH /api/jobs/:id`
- `DELETE /api/jobs/:id`

### Candidates
- `GET /api/candidates`
- `GET /api/candidates/:id`
- `PATCH /api/candidates/:id/stage`
- `PATCH /api/candidates/:id/assign`
- `POST /api/candidates/:id/note`

### Interviews
- `GET /api/interviews`
- `GET /api/interviews/calendar`
- `POST /api/interviews`

### Dashboard
- `GET /api/dashboard/overview`

### Analytics
- `GET /api/analytics/overview`
- `GET /api/analytics/pipeline`
- `GET /api/analytics/sources`
- `GET /api/analytics/time-to-hire`
- `GET /api/analytics/interviews`

## Notes

- Settings UI is currently structured for workspace preferences, but most settings persistence is still placeholder-only.
- Profile is backed by real authenticated user data.
- Analytics and dashboard use real backend data.
- Landing page includes Framer Motion effects.
- Public candidate account creation is intentionally not supported.

## Known Future Work

- persistent workspace settings API
- invite-based user onboarding
- password reset flow
- notification persistence
- email delivery integration
- S3 status/config UI
- deeper audit logging UI
- AI resume scoring backend completion

## Recommended Local Flow

1. Start MongoDB connectivity through your configured `MONGO_URI`
2. Run `npm run seed:admin` in `Server`
3. Start backend with `npm run dev`
4. Start frontend with `npm run dev`
5. Log in with the seeded admin account
6. Create recruiter/viewer users from `/users`

## License

This project currently has no explicit license declared in the repository.
