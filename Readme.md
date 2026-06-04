# HireFlow

HireFlow is a hiring management platform for managing jobs, candidates, interviews, analytics, and team access.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, MongoDB

## Project Structure

```text
Hireflow/
  Client/
  Server/
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB connection string

### 1. Install dependencies

```bash
cd Client
npm install
```

```bash
cd Server
npm install
```

### 2. Configure environment

Create `Server/.env`:

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

### 3. Seed the first admin

```bash
cd Server
npm run seed:admin
```

### 4. Start the app

Backend:

```bash
cd Server
npm run dev
```

Frontend:

```bash
cd Client
npm run dev
```

## Default Local URLs

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`

## Main Features

- Authentication and role-based access
- Jobs management
- Candidates management
- Interview scheduling
- Pipeline tracking
- Dashboard and analytics
- User management

