# RGA Dashboard (UpJob227)

## Overview
This repository contains a multi-tenant Web Dashboard for reporting and integrations.

**Main parts**
- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React (TypeScript)
- **Database**: SQL scripts + Prisma schema

## Project Structure
- `backend/` Backend API server
- `frontend/` Frontend web app
- `database/` Database scripts and verification

## Requirements
- Node.js (LTS recommended)
- PostgreSQL

## Quick Start (Local)
### 1) Database
1. Create a PostgreSQL database (example name: `rga_dashboard`).
2. Configure backend `DATABASE_URL` to point to it.

### 2) Backend
1. Copy env template:
   - `backend/.env.example` -> `backend/.env`
2. Fill required values (at minimum `DATABASE_URL` and `JWT_SECRET`).
3. Install and run:
   - `npm install`
   - `npm run dev`

Backend will start the scheduled sync job on server start.

### 3) Frontend
1. Install and run:
   - `npm install`
   - `npm start`
2. Point frontend API base URL to the backend (see `frontend/README.md`).

## Key Features
- Multi-tenant data model (tenant-scoped data)
- Integrations sync (Google Ads, Facebook, Shopee, Lazada, TikTok, etc.)
- Scheduled sync job (cron)
- API endpoints for manual sync / pipeline runs

## Documentation (short, split by area)
- Backend: `backend/README.md` (to be created)
- Frontend: `frontend/README.md` (to be created)
- Database: `database/README.md` (to be created)

## Notes
- This repo intentionally excludes large binaries and archives.
- If you need to add docs again, keep them short and split by subsystem.
