# QueueLess - Real-Time Virtual Queue Management Platform

QueueLess is an end-to-end healthcare technology platform designed for hospitals, clinics, and outpatient diagnostic centers. It eliminates crowded physical waiting rooms by enabling patients to book online-only virtual tokens, track their live queue position remotely in real time, and arrive precisely when their consultation is ready.

---

## Architecture Overview

```text
QueueLess/
├── backend/    # Node.js + Express + MongoDB + Socket.IO REST API
├── web/        # React 19 + Vite Hospital Staff & Admin Dashboard
├── mobile/     # React Native + Expo Patient & Staff Mobile Application
└── README.md
```

---

## Technology Stack

- **Backend:** Node.js (v24), Express.js 5, MongoDB + Mongoose 9, Socket.IO 4, JWT, bcryptjs, Zod
- **Hospital Web Dashboard:** React 19, Vite 8, React Router 7, TanStack Query 5, Axios, Socket.IO Client, Healthcare Design System
- **Mobile Application:** React Native (0.88), Expo (SDK 58), Expo Router, Redux Toolkit, Redux Persist, SecureStore, Axios

---

## Key Features & User Workflows

### 1. Patient Workflows (Mobile App)
- **Secure Authentication:** Self-registration and login with JWT and SecureStore token persistence.
- **Hospital Discovery:** Search and discover platform-verified hospitals by city or facility name.
- **Department & Clinic Selection:** View outpatient clinics (Cardiology, Orthopedics, Pediatrics, General Medicine), doctor rosters, consultation benchmarks, and operating hours.
- **Atomic Virtual Token Booking:** Instant online-only token assignment with concurrency protection and strict duplicate booking prevention.
- **Live Queue Tracker:** Real-time countdown displaying exact position in line (e.g. *"2 patients ahead of you"*), estimated wait minutes, and live consultation alerts (*"YOUR TOKEN HAS BEEN CALLED"*).
- **Self-Service Cancellation:** Safely cancel active tokens directly from the tracker.
- **Booking History & Profile:** Historical records of previous appointments with final statuses and timestamps.

### 2. Hospital Staff Workflows (Web Dashboard & Mobile Terminal)
- **Live Queue Console:** Select department clinic, view real-time waiting list, and advance the queue sequentially.
- **One-Click Actions:** Call Next Patient, Start Consultation, Mark Treatment Completed, or Mark No-Show.
- **Outpatient Directory:** Search patients by token display (e.g. `CARD-001`), patient name, or phone number with status filters.
- **Department Configuration:** Add/manage clinical departments, consultation benchmarks, floor/room numbers, and daily token caps.
- **Staff Management:** Invite consulting doctors, triage nurses, and administrators with role-based permissions.
- **Facility Rules & Settings:** Configure operating hours, OPD opening/closing times, and global token limits.

### 3. Concurrency & Security Architecture
- **Single Source of Truth:** Backend and MongoDB atomically allocate sequential token counters (`$inc: { totalIssued: 1 }`), guaranteeing zero duplicate tokens even under heavy concurrency.
- **Strict Role-Based Access Control (RBAC):** Patients cannot trigger staff actions; staff cannot access unassigned hospital queues.
- **Protection & Sanitization:** Rate-limiting on authentication and booking endpoints, Helmet security headers, password hashing with bcryptjs (salt rounds 10), and Zod input validation.

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v20+ recommended, tested on v24.12.0)
- npm (v10+, tested on v11.6.2)
- MongoDB running locally on `mongodb://localhost:27017/queueless` or a MongoDB Atlas URI

### 2. Database Seeding
To populate the database with demo hospitals, departments, doctors, and user accounts:
```bash
npm run seed --prefix backend
```

#### Demo Credentials for Testing:
| Role | Email | Password |
| :--- | :--- | :--- |
| **Hospital Staff / Doctor** | `staff@hospital.com` | `Password123!` |
| **Platform Administrator** | `admin@queueless.com` | `Password123!` |
| **Demo Patient** | `patient@example.com` | `Password123!` |

---

### 3. Running Backend API
```bash
cd backend
npm run dev     # Runs on http://localhost:5000 with nodemon
```
Health Check: `http://localhost:5000/health`

### 4. Running Hospital Web Dashboard
```bash
cd web
npm run dev     # Runs on http://localhost:5173
```
Production Build Verification:
```bash
npm run build --prefix web
```

### 5. Running Mobile Application
```bash
cd mobile
npx expo start  # Launches Expo CLI for iOS / Android / Web
```

---

## Automated Test Verification

Run backend unit and integration test suites:
```bash
npm test --prefix backend
```
- `tests/health.test.js`: Health checks and error handlers.
- `tests/auth.test.js`: Bcrypt password hashing, credential validation, sanitization.
- `tests/queue.test.js`: Date helpers, token counters, and queue utilities.

Run linters:
```bash
# Mobile linting
Push-Location mobile; $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint app --ext .js,.jsx; Pop-Location

# Web linting
Push-Location web; npx eslint src --ext js,jsx; Pop-Location
```

---

## Core Business Rules
1. **Online Virtual Tokens Only**: No physical walk-in tokens.
2. **Access Control**: Public registration for patients; invitation-only provisioning for hospital staff and administrators.
3. **Queue Integrity**: Backend and MongoDB are the single source of truth for queue order, wait-time estimation, and duplicate token prevention.
