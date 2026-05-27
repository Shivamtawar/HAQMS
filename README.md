# HAQMS: Hospital Appointment & Queue Management System

Welcome to **HAQMS (Hospital Appointment & Queue Management System)**. This is a fully functional, deliberately imperfect full-stack web application designed for engineering internship candidate evaluations. 

Candidates are tasked with auditing the codebase to identify, debug, profile, secure, and optimize performance bottlenecks, memory leaks, concurrency issues, and security vulnerabilities.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js (App Router, Tailwind CSS, Lucide icons, Context API)
- **Backend**: Node.js + Express
- **Database & ORM**: PostgreSQL + Prisma ORM
- **Process Management**: Docker Compose (Optional local PostgreSQL helper)

---

## 🚀 Getting Started & Setup

Follow these steps to spin up the local development workspace:

### 1. Auto-Install Dependencies
Run the included workspace orchestrator bootstrap script to install packages in the root, frontend, and backend packages:
```bash
chmod +x setup.sh
./setup.sh
```

### 2. Launch the Database
You need a running PostgreSQL server. If you have Docker installed, you can spin up the preconfigured container:
```bash
docker-compose up -d
```
Alternatively, configure your local PostgreSQL server and update the connection URL in `backend/.env`:
```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/haqms?schema=public"
```

### 3. Deploy Schema & Seed Mock Data
Apply Prisma schema migrations to the database and populate it with pre-built mock records (including administrative logins, medical histories, physician slots, and queue tokens):
```bash
npm run db:setup --prefix backend
```

### 4. Boot Dev Servers
Launch both the Next.js development client (port `3000`) and the Express API server (port `5000`) concurrently using:
```bash
npm run dev
```

---

## 🔑 Pre-Seeded Accounts
The database seed script populates the database with default accounts (All passwords are **`password123`**):

| Role | Email | Purpose / Flow Testing |
|---|---|---|
| **Administrator** | `admin@haqms.com` | Access system reports, view audit logs, view full physician registries |
| **Receptionist** | `reception1@haqms.com` | Register patients, book slots, perform direct queue check-in |
| **Doctor** | `doctor1@haqms.com` | View daily patient worklist, manage active calling monitors, read history |

---

## 🎯 Internship Evaluation Tasks

As an internship candidate, your evaluation is divided into five core objectives:

### 🔍 Challenge 1: Security Audit
Identify and patch several production-level security bugs:
- **Credential Logging**: Find where raw user passwords are logged in plain text.
- **Leaky Token Signature**: Audit how JWTs are signed, stored, and verified.
- **SQL Injection**: Locate the search input vulnerable to SQL injection and rewrite it using parameterized queries.
- **Bypassed Authorization**: Find the admin action endpoint that fails to enforce actual role authorizations.

### ⚡ Challenge 2: Backend Performance & Concurrency
Analyze and optimize backend logic:
- **N+1 Database Queries**: Identify the endpoint fetching core list elements but executing separate queries per row in a loop.
- **Event-Loop Blocking**: Locate sequential async database queries where parallel triggers should be utilized.
- **Slow aggregation endpoint**: Fix the slow nested report endpoint that locks the event loop.
- **Check-in Token Race Condition**: Find why concurrent direct check-ins assign duplicate token numbers and patch it using transaction locks or auto-increment sequences.

### 💾 Challenge 3: Database & Schema Optimization
Refactor DB layers:
- **Schema Vulnerabilities**: Locate the missing constraints that permit double-booking the same physician at the exact same millisecond slot.
- **Missing Indices**: Add appropriate indices to speed up foreign key relationships and status filters under load.
- **Paging Optimization**: Fix the listing route that performs in-memory pagination slicing instead of SQL pagination.

### 🖥️ Challenge 4: Frontend Memory & React Optimization
Examine frontend React components:
- **Severe Memory Leak**: Navigate to the Live Public Queue Board (`/queue`). Mount and unmount it repeatedly. Find the leak in `src/app/queue/page.js` and patch it.
- **Unnecessary Re-renders**: Optimize search input fields that trigger complete list re-renders on every single keystroke.
- **NULL Value Application Crash**: Log in as a Doctor (`doctor1@haqms.com`), click on one of the patients with a blank medical history (e.g., Clark Kent or Bruce Wayne), and diagnose why the entire React app crashes on rendering.

### 🏗️ Challenge 5: Incomplete Feature Delivery
- **Resolve styled 404 error**: Clicking "View Diagnostic Reports Details (Legacy App)" on a patient profile triggers a 404 page. Your final task is to build out that missing page (`src/app/patients/[id]/history-records/page.js`) to fetch and render the patient clinical record.

---

Good luck! You will be evaluated based on the cleanliness, correctness, efficiency, and safety of your refactoring.

---

## ✅ Issues Found & Fixed

> Full details, before/after context, and reasoning for every fix: **[ChangesFixed.md](ChangesFixed.md)**

### 🔐 Challenge 1 — Security (12 fixes)

| # | Issue | File |
|---|---|---|
| 1 | Plaintext passwords logged to stdout on every login and registration | `routes/auth.js` |
| 2 | Hardcoded JWT secret fallback — app ran insecurely if env var missing | `routes/auth.js`, `middleware/auth.js` |
| 3 | JWT expiry set to 365 days — stolen tokens valid for a year | `routes/auth.js` |
| 4 | `ignoreExpiration: true` — expired tokens accepted as valid forever | `middleware/auth.js` |
| 5 | JWT verification error detail leaked to client (`details: error.message`) | `middleware/auth.js` |
| 6 | `authorizeAdminOnlyLegacy` role check was commented out — any user could delete patients | `middleware/auth.js` |
| 7 | SQL injection via raw string interpolation in doctor search (`$queryRawUnsafe`) | `routes/doctors.js` |
| 8 | Registration response included the bcrypt password hash | `routes/auth.js` |
| 9 | Client could self-assign any role including `ADMIN` on registration | `routes/auth.js` |
| 10 | Stack traces and DB error messages leaked in error responses | `routes/auth.js`, `index.js` |
| 11 | Wildcard CORS (`cors()`) — any origin could call the API | `index.js` |
| 12 | `PATCH` status endpoints accepted arbitrary strings — no enum validation | `routes/appointments.js`, `routes/queue.js` |

---

### ⚡ Challenge 2 — Backend Performance (4 fixes)

| # | Issue | File |
|---|---|---|
| 1 | N+1 queries in appointments endpoint — 2 extra DB queries per row in a loop | `routes/appointments.js` |
| 2 | 4 independent DB aggregates in doctor stats run sequentially instead of in parallel | `routes/doctors.js` |
| 3 | Report endpoint: sequential per-doctor loop with nested queries + artificial 80ms sleep per doctor | `routes/reports.js` |
| 4 | Queue check-in race condition — read-then-write with 350ms artificial sleep allowed duplicate token numbers | `routes/queue.js` |

---

### 💾 Challenge 3 — Database & Schema (4 fixes)

| # | Issue | File |
|---|---|---|
| 1 | No unique constraint on `(doctorId, appointmentDate)` — double-booking was structurally possible | `schema.prisma` |
| 2 | 7 missing indexes on frequently filtered/sorted columns across all models | `schema.prisma` |
| 3 | No `onDelete` cascade rules — deleting a patient/doctor left orphaned rows or silently failed | `schema.prisma` |
| 4 | Patient list fetched entire table into memory before filtering/paginating in JS | `routes/patients.js` |

---

### 🖥️ Challenge 4 — Frontend (3 fixes)

| # | Issue | File |
|---|---|---|
| 1 | `setInterval` with no cleanup — each mount stacked a new polling timer that never stopped | `queue/page.js` |
| 2 | Search fired an API call on every keystroke — no debounce | `dashboard/page.js` |
| 3 | `medicalHistory.toUpperCase()` with no null check — crashed the entire page for patients with no history | `dashboard/page.js` |

---

### 🏗️ Challenge 5 — Feature Delivery (1 fix)

| # | Issue | File |
|---|---|---|
| 1 | `/patients/:id/history-records` route was entirely missing — every click led to a 404 | `patients/[id]/history-records/page.js` |
