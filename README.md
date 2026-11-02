# QueueLess - Virtual Queue Management Platform

QueueLess is a real-time virtual queue management platform designed for hospitals, clinics, and diagnostic centers. Patients book online virtual tokens and track their real-time position remotely without physically waiting in crowded waiting rooms.

---

## Architecture Overview

```text
QueueLess/
├── backend/    # Node.js + Express + MongoDB + Socket.IO REST API
├── web/        # React + Vite Hospital Staff Dashboard
├── mobile/     # React Native + Expo Patient & Staff Mobile App
└── README.md
```

---

## Technology Stack

- **Backend:** Node.js (v24), Express.js, MongoDB + Mongoose, Socket.IO, JWT, bcryptjs, Zod
- **Hospital Web Dashboard:** React 19, Vite, React Router 7, TanStack Query 5, Axios, CSS
- **Mobile Application:** React Native (0.88), Expo (SDK 58), Expo Router, Redux Toolkit, Redux Persist, Axios

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v20+ recommended, current: v24.12.0)
- npm (v10+, current: v11.6.2)
- MongoDB running locally on `localhost:27017` or a MongoDB Atlas connection string

### 2. Backend Setup
```bash
cd backend
# Dependencies are pre-installed
npm run dev     # Starts server on http://localhost:5000 with nodemon
```
Health check endpoint: `http://localhost:5000/health`

### 3. Web Dashboard Setup
```bash
cd web
# Dependencies are pre-installed
npm run dev     # Starts Vite dev server (usually http://localhost:5173)
```

### 4. Mobile Application Setup
```bash
cd mobile
# Dependencies are pre-installed
npx expo start  # Launches Expo CLI for iOS / Android / Web
```

---

## Core Rules & Principles
1. **Online Virtual Tokens Only**: No physical walk-in tokens.
2. **Access Control**: Public registration for patients; invitation-only provisioning for hospital staff and administrators.
3. **Queue Integrity**: Backend and MongoDB are the single source of truth for queue order, wait-time estimation, and duplicate token prevention.
