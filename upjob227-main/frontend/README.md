# Frontend (Web)

## Tech Stack
- React + TypeScript (`react-scripts`)
- React Router
- TailwindCSS
- Axios

## Location
- Source: `frontend/src/`
- App entry: `frontend/src/index.tsx` -> `frontend/src/App.tsx`

## Setup
### 1) Install
```bash
npm install
```

### 2) API Base URL
This frontend uses one of the following:
- **CRA proxy** in `frontend/package.json` (currently: `http://localhost:3001`)
- **Explicit API base** via env `REACT_APP_API_BASE`

In code:
- `frontend/src/services/api.ts` uses:
  - `process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1'`

Recommended local setup:
- Backend at: `http://localhost:3001`
- API prefix: `/api/v1`
- Frontend at: `http://localhost:3000`

If you need to override:
1. Create `frontend/.env` (CRA format)
2. Add:
```bash
REACT_APP_API_BASE=http://localhost:3001/api/v1
```

### 3) Run
```bash
npm start
```

### 4) Build
```bash
npm run build
```

## Authentication / Tenant
- The API client stores token and tenant info in `localStorage`.
- `frontend/src/services/api.ts` automatically sends:
  - `Authorization: Bearer <token>`
  - `X-Tenant-Id: <tenantId>` (if stored)

## Notes
- If you change backend `PORT` or `API_PREFIX`, update the frontend `REACT_APP_API_BASE` or CRA `proxy`.
