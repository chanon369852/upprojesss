# PROJECT_MAP (ไฟล์เดียวอ่านรู้เรื่อง)

เอกสารนี้สรุปว่าโปรเจคนี้:
- **เก็บข้อมูลอะไร** (DB/ไฟล์ config/LocalStorage)
- **ดึงข้อมูลจากไหน** (API / Integration providers)
- **อะไรทำงานจากไฟล์ไหน** (entrypoints, routes, jobs)

---

## 1) โครงสร้างโปรเจค
- **`backend/`**
  - API Server + Sync jobs + Prisma
- **`frontend/`**
  - React Web App
- **`database/`**
  - SQL scripts สำหรับสร้าง/ตรวจสอบฐานข้อมูล

---

## 2) Backend: ทำงานจากไฟล์ไหน

### 2.1 Entry Point (ตัวเริ่มทำงาน)
- **`backend/src/server.ts`**
  - โหลด `.env`
  - สร้าง Express app + middleware
  - register routes ใต้ `API_PREFIX` (default `/api/v1`)
  - เปิด Swagger (เฉพาะ non-production)
  - เชื่อม DB ผ่าน `prisma`
  - **สั่งเริ่ม cron job อัตโนมัติ**: `startSyncJob()`

### 2.2 Routes (API ถูกผูกจากไฟล์ไหน)
ใน `backend/src/server.ts` มีการ `app.use()` ผูก route เหล่านี้:
- **`/api/v1/bootstrap`** -> `backend/src/routes/bootstrap.routes.ts`
- **`/api/v1/auth`** -> `backend/src/routes/auth.routes.ts`
- **`/api/v1/auth`** -> `backend/src/routes/google-auth.routes.ts`
- **`/api/v1/auth`** -> `backend/src/routes/tiktok-auth.routes.ts`
- **`/api/v1/tenants`** -> `backend/src/routes/tenant.routes.ts`
- **`/api/v1/campaigns`** -> `backend/src/routes/campaign.routes.ts`
- **`/api/v1/metrics`** -> `backend/src/routes/metric.routes.ts`
- **`/api/v1/alerts`** -> `backend/src/routes/alert.routes.ts`
- **`/api/v1/reports`** -> `backend/src/routes/report.routes.ts`
- **`/api/v1/ai`** -> `backend/src/routes/ai.routes.ts`
- **`/api/v1/integrations`** -> `backend/src/routes/integration.routes.ts`
- **`/api/v1/users`** -> `backend/src/routes/user.routes.ts`
- **`/api/v1/alert-history`** -> `backend/src/routes/alertHistory.routes.ts`
- **`/api/v1/history`** -> `backend/src/routes/history.routes.ts`
- **`/api/v1/data`** -> `backend/src/routes/data.routes.ts`
- **`/api/v1/pipeline`** -> `backend/src/routes/dataPipeline.routes.ts`
- **`/api/v1/webhooks`** -> `backend/src/routes/webhook.routes.ts` (public endpoints)
- **`/api/v1/mock`** -> `backend/src/routes/mock.routes.ts`
- **`/api/v1/seo`** -> `backend/src/routes/seo.routes.ts`

> ส่วนใหญ่ route จะผ่าน `tenantMiddleware` เพื่อให้เป็น multi-tenant

### 2.3 Route -> Controller -> DB (รายการสำคัญ)

#### Metrics
- **`GET /api/v1/metrics/overview`**
  - Route: `backend/src/routes/metric.routes.ts`
  - Controller: `backend/src/controllers/metric.controller.ts` -> `getOverview`
  - DB:
    - `metric.aggregate(...)` บนตาราง `metrics`
    - filter ด้วย `tenantId` จาก `tenantMiddleware`

- **`GET /api/v1/metrics/dashboard?period=7d|30d|...`**
  - Route: `backend/src/routes/metric.routes.ts`
  - Controller: `backend/src/controllers/metric.controller.ts` -> `getDashboardData`
  - DB:
    - `metric.findMany(...)` บนตาราง `metrics`
    - group ใน memory ตาม `date`

- **`POST /api/v1/metrics/bulk`**
  - Route: `backend/src/routes/metric.routes.ts`
  - Controller: `backend/src/controllers/metric.controller.ts` -> `bulkCreateMetrics`
  - DB:
    - `metric.createMany({ skipDuplicates: true })` บนตาราง `metrics`

#### Integrations
- **`GET /api/v1/integrations`**
  - Route: `backend/src/routes/integration.routes.ts`
  - Controller: `backend/src/controllers/integration.controller.ts` -> `getIntegrations`
  - DB:
    - `integration.findMany({ where: { tenantId }})` บนตาราง `integrations`

- **`GET /api/v1/integrations/notifications`**
  - Route: `backend/src/routes/integration.routes.ts`
  - Controller: `backend/src/controllers/integration.controller.ts` -> `getIntegrationNotifications`
  - DB:
    - `integrationNotification.findMany(...)` บนตาราง `integration_notifications`

- **`POST /api/v1/integrations`** (create)
  - Route: `backend/src/routes/integration.routes.ts`
  - Controller: `backend/src/controllers/integration.controller.ts` -> `createIntegration`
  - Flow:
    - validate credentials ผ่าน service client (เช่น `facebookService.validateCredentials`)
    - create record ในตาราง `integrations`

- **`POST /api/v1/integrations/:id/sync`** (manual sync)
  - Route: `backend/src/routes/integration.routes.ts`
  - Controller: `backend/src/controllers/integration.controller.ts` -> `syncIntegration`
  - Flow:
    - อ่าน integration จากตาราง `integrations`
    - เลือก provider แล้วเรียก sync implementation (เช่น `services/googleAds.ts`)
    - sync implementation จะ upsert ลง `campaigns` และ `metrics` (ตาม provider)

#### Data Pipeline
- **`POST /api/v1/pipeline/run`**
  - Route: `backend/src/routes/dataPipeline.routes.ts`
  - Controller: `backend/src/controllers/dataPipeline.controller.ts` -> `runPipeline`
  - Service: `backend/src/services/dataPipeline.service.ts` -> `runPipeline(config)`
  - DB (โดยย่อ):
    - อ่าน `integrations` เพื่อหาอันที่ active
    - เรียก provider sync (เขียนลง `campaigns`/`metrics`)

- **`GET /api/v1/pipeline/status`**
  - Route: `backend/src/routes/dataPipeline.routes.ts`
  - Controller: `backend/src/controllers/dataPipeline.controller.ts` -> `getSyncStatus`
  - DB:
    - อ่าน `integrations` และสถานะ/เวลา sync

- **`GET /api/v1/pipeline/metrics?startDate=...&endDate=...`**
  - Route: `backend/src/routes/dataPipeline.routes.ts`
  - Controller: `backend/src/controllers/dataPipeline.controller.ts` -> `getAggregatedMetrics`
  - DB:
    - aggregate จาก `metrics` (tenant-scoped)

- **`POST /api/v1/pipeline/sync/:provider`**
  - Route: `backend/src/routes/dataPipeline.routes.ts`
  - Controller: `backend/src/controllers/dataPipeline.controller.ts` -> `syncSingleProvider`
  - Service: `backend/src/services/dataPipeline.service.ts`

### 2.4 Middleware สำคัญ (tenant/auth)

#### Auth middleware มี 2 แบบ (ต้องรู้เพื่อไล่ flow ให้ถูก)
- **แบบ A: `authenticate`**
  - ไฟล์: `backend/src/middleware/auth.middleware.ts`
  - ใช้ใน routes ส่วนใหญ่ เช่น `metrics`, `integrations` (ผ่าน `router.use(authenticate)`)
  - ผลลัพธ์ที่ set ลง req:
    - `req.userId`, `req.tenantId`, `req.userRole`
  - มีเงื่อนไขว่า user ต้อง `emailVerified` ด้วย

- **แบบ B: `authenticateToken`**
  - ไฟล์: `backend/src/middleware/auth.ts`
  - ใช้ใน `backend/src/routes/dataPipeline.routes.ts`
  - ผลลัพธ์ที่ set ลง req:
    - `req.user = { id, tenantId, role, ... }`

> หมายเหตุ: ตอนนี้ pipeline ใช้ auth แบบ B แต่ server.ts ใช้ `tenantMiddleware` ครอบ pipeline ก่อนอยู่แล้ว
> (ใน `server.ts`: `app.use(`${API_PREFIX}/pipeline`, tenantMiddleware, dataPipelineRoutes);`)

- **`backend/src/middleware/tenant.middleware.ts`**
  - อ่าน tenant จาก header (เช่น `X-Tenant-Id`) แล้วผูกเข้า `req.tenantId`
  - ถ้ามี Bearer token จะพยายามอ่าน tenant จาก JWT เพื่อกัน spoofing
- **`backend/src/middleware/auth.middleware.ts`**
  - ตรวจ JWT (`Authorization: Bearer <token>`)

---

## 3) Automation / Cron: อะไรทำงานอัตโนมัติ

### 3.1 Cron job entry
- **`backend/src/jobs/sync.job.ts`**
  - รันตาม schedule (cron)
  - เลือก integrations ที่ active แล้วเรียก sync ตาม provider

Cron behavior (ตามโค้ด):
- Schedule: `0 * * * *` (ทุกชั่วโมง)
- เลือก `integrations` ที่:
  - `isActive = true`
  - `lastSyncAt` เป็น `null` หรือเก่ากว่า 1 ชั่วโมง
- หลัง sync สำเร็จ:
  - update `integrations.lastSyncAt = now`
  - update `integrations.status = 'active'`
- ถ้า sync fail:
  - update `integrations.status = 'error'`

### 3.2 Sync provider implementations (ตัวที่ “เขียนลง DB”)
แนวคิด: provider sync จะดึงข้อมูลจาก API ภายนอก แล้ว **upsert ลง DB**
- **Google Ads (เขียน campaigns/metrics ลง DB)**
  - `backend/src/services/googleAds.ts`
- **Shopee (เขียน campaigns/metrics ลง DB)**
  - `backend/src/services/shopee.ts`
- **Lazada (เขียน campaigns/metrics ลง DB)**
  - `backend/src/services/lazada.ts`
- **Facebook (เขียน campaigns/metrics ลง DB)**
  - `backend/src/services/facebook.ts`
- **GA4**
  - `backend/src/services/ga4.ts`

ตาราง DB ที่ sync มักแตะ (ภาพรวม):
- `integrations` (อ่าน credentials/config, update lastSyncAt บางส่วน)
- `campaigns` (upsert by tenant/platform/externalId)
- `metrics` (upsert by tenant/campaign/date/hour/platform/source)

หมายเหตุเรื่อง “ไฟล์ชื่อคล้ายกัน”:
- **`facebook.ts`** ใช้แนว sync job (เขียนลง DB)
- **`facebook.service.ts`** มักใช้แนว API client (ดึงข้อมูลไปตอบ API)

### 3.3 Data Pipeline (รันแบบสั่งผ่าน API)
- Routes: `backend/src/routes/dataPipeline.routes.ts`
- Controller: `backend/src/controllers/dataPipeline.controller.ts`
- Service: `backend/src/services/dataPipeline.service.ts`
  - รวม providers และตัดสินใจว่าจะ sync เมื่อไหร่ (`shouldSync`)
  - ทำงานแบบ batch + จำกัด concurrency

---

## 4) Backend: เก็บข้อมูลอะไรไว้ที่ไหน

### 4.1 Database (PostgreSQL)
ข้อมูลหลักถูกเก็บใน PostgreSQL โดยเข้าถึงผ่าน Prisma

- Prisma schema:
  - **`backend/prisma/schema.prisma`**
- Prisma client:
  - **`backend/src/utils/prisma.ts`**

ตัวอย่างตารางสำคัญ (แนวคิด):
- **`tenants`**: tenant / ลูกค้า
- **`users`**: ผู้ใช้งานใน tenant
- **`integrations`**: การเชื่อมต่อ provider + credentials/config + lastSyncAt
- **`campaigns`**: แคมเปญที่ normalized
- **`metrics`**: metrics รายวัน/รายชั่วโมง (มี unique composite)

ตารางที่เกี่ยวกับการ sync/ติดตามสถานะ:
- **`sync_histories`**: เก็บประวัติการ sync (ถูกอ่านผ่าน `integration.controller.ts` -> `getSyncHistory`)
- **`integration_notifications`**: แจ้งเตือนปัญหาการเชื่อมต่อ/ซิงค์

### 4.2 Environment (.env)
- Template: **`backend/.env.example`**
- Runtime config: **`backend/.env`** (ไม่ควร commit)

---

## 5) Database folder: ใช้ทำอะไร

### 5.1 สร้าง schema
- **`database/sql/setup_rga_dashboard.sql`**
  - สคริปต์หลักสำหรับสร้างตารางและ extension
- **`database/sql/schema.sql`**
  - ไฟล์ schema อีกแบบ (อ้างอิง/ทางเลือก)

### 5.2 ตรวจสอบ DB
- **`database/verify/verify_database.sql`**
  - ตรวจจำนวนตาราง/extension/indexes/foreign keys/health
- **`database/verify/*.sql`**
  - ชุดไฟล์ verify แยกย่อย

### 5.3 สร้าง admin user
- **`database/sql/create_admin_user.sql`**
  - ใช้สร้าง admin user เริ่มต้น (ใช้อย่างระมัดระวัง)

---

## 6) Frontend: ทำงานจากไฟล์ไหน

### 6.1 Entry Point
- **`frontend/src/index.tsx`**
  - render `<App />`

### 6.2 Routes (หน้าเว็บ)
- **`frontend/src/App.tsx`**
  - routes หลัก:
    - `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
    - `/dashboard`, `/integrations`, `/users`, `/webhooks`, `/history`, `/profile`
  - guard แบบง่าย: ต้องมี `token` และ `tenantId/tenantSlug` ใน `localStorage`

### 6.3 API Client (ดึงข้อมูลจาก backend)
- **`frontend/src/services/api.ts`**
  - baseURL:
    - `REACT_APP_API_BASE` หรือ default `http://localhost:3001/api/v1`
  - เก็บ/ใช้ข้อมูลใน `localStorage`:
    - `token`
    - `tenantId` หรือ `tenantSlug`
    - `userRole`
  - ส่ง header อัตโนมัติ:
    - `Authorization: Bearer <token>`
    - `X-Tenant-Id: <tenantId>` (ถ้ามี)

API flow ที่เกิดขึ้นจริง:
- Login/Register สำเร็จ -> เก็บ `token`, `tenantId`, `userRole` ใน `localStorage`
- ทุก request ถัดไป -> interceptor แนบ token + tenant header

### 6.4 RBAC (สิทธิ์)
- **`frontend/src/lib/rbac.ts`**
  - นิยาม roles/permissions
  - ใช้ในหน้า protected (ตัวอย่างใน `App.tsx`)

---

## 7) สรุปแบบสั้น (ตอบโจทย์ “เก็บ/ดึง/ทำงานจากไฟล์ไหน”)
- **เก็บข้อมูลหลัก**: PostgreSQL (`database/*` สร้าง/verify, `backend/prisma/schema.prisma` model)
- **เก็บ config runtime**: `backend/.env`
- **เก็บ session ฝั่งเว็บ**: `localStorage` (token/tenant/role) ผ่าน `frontend/src/services/api.ts`
- **ดึงข้อมูลจาก provider**:
  - ผ่าน provider sync functions ใน `backend/src/services/*` แล้ว upsert ลง DB
- **ทำงานอัตโนมัติ**:
  - `backend/src/server.ts` -> `startSyncJob()` -> `backend/src/jobs/sync.job.ts`
- **ทำงานแบบกดสั่ง (manual)**:
  - `/api/v1/pipeline/*` -> `dataPipeline.*`
  - `/api/v1/integrations/*` -> integration controller/service

---

## 8) ไฟล์สำคัญ (จัดกลุ่มตามหน้าที่)

### Config / Boot
- `backend/src/server.ts` (ประกอบระบบทั้ง server)
- `backend/.env` (runtime config)
- `backend/.env.example` (ตัวอย่าง)

### DB
- `backend/prisma/schema.prisma` (Prisma models)
- `backend/src/utils/prisma.ts` (Prisma client instance)

### Jobs / Automation
- `backend/src/jobs/sync.job.ts` (cron)

### Controllers (รับ request/ตอบ response)
- `backend/src/controllers/auth.controller.ts`
- `backend/src/controllers/metric.controller.ts`
- `backend/src/controllers/integration.controller.ts`
- `backend/src/controllers/dataPipeline.controller.ts`

### Services (business logic / provider)
- Provider sync (เขียนลง DB): `backend/src/services/googleAds.ts`, `facebook.ts`, `shopee.ts`, `lazada.ts`, `ga4.ts`
- Provider API client (ดึงไปตอบ API): `backend/src/services/facebook.service.ts`, `googleads.service.ts`, `tiktok.service.ts`, `shopee.service.ts`, `line.service.ts`

### Frontend
- `frontend/src/index.tsx` (entry)
- `frontend/src/App.tsx` (routes)
- `frontend/src/services/api.ts` (API client + localStorage + headers)
- `frontend/src/lib/rbac.ts` (roles/permissions)

---

## 9) DATA FLOW MAP: ตาราง DB → API → Controller/Service → Frontend (ละเอียด)

> เป้าหมายของหัวข้อนี้: เปิดไฟล์นี้ไฟล์เดียว แล้วตอบได้ว่า “ค่านี้มาจากไหน/คำนวณยังไง/แสดงตรงไหน”

### 9.1 หมายเหตุสำคัญเรื่องฐานข้อมูล (Schema vs DB จริง)
ตอนนี้จากรายการคอลัมน์ที่คุณ paste มา:
- ตาราง `tenants` **ยังไม่เห็น** `support_access`
- ตาราง `users` **ยังไม่เห็น** `expires_at`, `status`, `permissions`

แปลว่า DB จริงยังไม่ได้ apply migration ล่าสุด (ยังไม่ `prisma migrate`).

### 9.2 Dashboard (Overview)

**Backend**
- Route:
  - `GET /api/v1/dashboard/overview?range=Today|7D|30D`
  - File: `backend/src/routes/dashboard.routes.ts`
- Controller:
  - `backend/src/controllers/dashboard.controller.ts` → `getDashboardOverview`
- DB tables:
  - `metrics` (หลัก)
  - `campaigns` (ประกอบชื่อ/top campaigns)

**Frontend**
- API client:
  - `frontend/src/services/api.ts` → `getDashboardOverview()` เรียก `/dashboard/overview`
- Page:
  - `frontend/src/components/Dashboard.tsx` (Dashboard container)
  - Section UI:
    - `frontend/src/components/dashboard/sections/overviewSection.tsx`

**Payload สำคัญที่ backend ส่ง** (ดูใน `getDashboardOverview`)
- `realtimeMessages`: impressions/clicks/conversions/revenue
- `aiSummaries`: CPM, CTR, ROAS, ROI
- `financial`: revenue/profit/cost/roi + breakdown by platform
- `conversionFunnel`: impressions→clicks→conversions→revenue
- `activeCampaigns`: top conversions + CPA
- `conversionPlatforms`: conversions grouped by platform
- `ltvCac`: LTV/CAC ratio + trend (weekly)

### 9.3 Dashboard (Trend)

**Backend**
- Route:
  - `GET /api/v1/dashboard/trend?period=7d|30d|90d|365d&startDate=&endDate=`
  - File: `backend/src/routes/dashboard.routes.ts`
- Controller:
  - `backend/src/controllers/dashboard.controller.ts` → `getTrendDashboard`
- DB tables:
  - `metrics` (revenue/spend/clicks/impressions/conversions/orders)
  - `leads` (lead sources, conversion rate)
  - `users` (เอาชื่อไปทำ sales reps แบบ mock mapping)

**Frontend**
- API client:
  - `frontend/src/services/api.ts` → `getTrendDashboard()` (เรียก `/dashboard/trend`)
- Section UI:
  - `frontend/src/components/dashboard/sections/trendSection.tsx`

### 9.4 Metrics (Time series / platform breakdown)

**Backend**
- Routes:
  - `GET /api/v1/metrics/overview` → `metric.controller.ts` → `getOverview`
  - `GET /api/v1/metrics/dashboard?period=...` → `metric.controller.ts` → `getDashboardData`
  - `GET /api/v1/metrics/platform-breakdown?...` → `metric.controller.ts` → `getPlatformBreakdown`
- DB tables:
  - `metrics`

**Frontend**
- hooks:
  - `frontend/src/hooks/useApi` (เช่น `useMetrics`) เรียก metric endpoints

### 9.5 SEO

**Backend**
- Routes:
  - `GET /api/v1/seo/overview?dateFrom&dateTo&limit=`
  - `GET /api/v1/seo/dashboard?dateFrom&dateTo&limit=`
  - File: `backend/src/routes/seo.routes.ts`
- Controller:
  - `backend/src/controllers/seo.controller.ts`
    - `getSeoOverview` (GA4 + GSC aggregate)
    - `getSeoDashboard` (payload สำหรับ SEO section)
- DB tables:
  - `metrics` (platform='ga4', campaignId=null)
  - `seo_metrics` (อ่าน metadata สำหรับ GSC/search performance)

**Frontend**
- API client:
  - `frontend/src/services/api.ts` → `getSeoDashboard()` เรียก `/seo/dashboard`
- Section UI:
  - `frontend/src/components/dashboard/sections/seoSection.tsx`

### 9.6 Commerce

**Backend**
- Routes:
  - `GET /api/v1/commerce/overview?period|startDate|endDate`
  - `GET /api/v1/commerce/products/performance?period|startDate|endDate`
  - File: `backend/src/routes/commerce.routes.ts`
- Controller:
  - `backend/src/controllers/commerce.controller.ts`
    - `getCommerceOverview`
    - `getProductPerformance`
- DB tables:
  - `metrics` (orders/conversions/revenue/spend/clicks/impressions + metadata)

**Frontend**
- API client:
  - `frontend/src/services/api.ts` → `getCommerceOverview()` เรียก `/commerce/overview`
  - `frontend/src/services/api.ts` → `getProductPerformance()` เรียก `/commerce/products/performance`
- Section UI:
  - `frontend/src/components/dashboard/sections/commerceSection.tsx`

### 9.7 CRM

**Backend**
- Route:
  - `GET /api/v1/crm/leads?status&stage&limit&offset`
  - File: `backend/src/routes/crm.routes.ts`
- Controller:
  - `backend/src/controllers/crm.controller.ts` → `listLeads`
- DB tables:
  - `leads`

**Frontend**
- API client:
  - `frontend/src/services/api.ts` → `getCrmLeads()` เรียก `/crm/leads`
- Section UI:
  - `frontend/src/components/dashboard/sections/crmSection.tsx`

### 9.8 Reports

**Backend**
- Routes:
  - `GET /api/v1/reports`
  - `POST /api/v1/reports`
  - `POST /api/v1/reports/:id/generate`
  - `GET /api/v1/reports/:id/download?format=pdf|csv|excel`
  - File: `backend/src/routes/report.routes.ts`
- Controller:
  - `backend/src/controllers/report.controller.ts`
- DB tables:
  - `reports`
  - `metrics` (ใช้ตอน generate/download)

**Frontend**
- API client:
  - `frontend/src/services/api.ts` → `getReports()`, `createReport()`
- Page:
  - `frontend/src/components/ReportsPage.tsx`
- Dashboard Section UI:
  - `frontend/src/components/dashboard/sections/reportsSection.tsx`

### 9.9 Settings (JSON imports)

**Backend**
- Routes:
  - `GET/POST/DELETE /api/v1/settings/json-imports`
  - `GET/POST/DELETE /api/v1/settings/pending/json-imports`
  - File: `backend/src/routes/settings.routes.ts`
- Controller:
  - `backend/src/controllers/settings.controller.ts`
- DB tables:
  - `tenant_settings`
    - key prefix:
      - `json_import:` (main)
      - `pending_json_import:` (pending)

**Frontend**
- API client:
  - `frontend/src/services/api.ts` → `listJsonImports/getJsonImport/createJsonImport/deleteJsonImport`
- Dashboard Section UI:
  - `frontend/src/components/dashboard/sections/settingsSection.tsx`

---

## 10) สูตรคำนวณ KPI/เปอร์เซ็นต์ (อ้างอิงโค้ดจริง)

### 10.1 Marketing KPIs (Dashboard Overview)
ที่มา: `backend/src/controllers/dashboard.controller.ts` → `getDashboardOverview`

- **CPM**
  - สูตร: `CPM = (spend / impressions) * 1000`
- **CTR**
  - สูตร: `CTR% = (clicks / impressions) * 100`
- **ROAS**
  - สูตร: `ROAS = revenue / spend`
- **Profit**
  - สูตร: `profit = revenue - spend`
- **ROI**
  - สูตร: `ROI% = (profit / spend) * 100`
- **CPA**
  - สูตร: `CPA = spend / conversions` (ถ้า conversions = 0 → 0)
- **LTV/CAC**
  - LTV (เฉลี่ย):
    - ถ้ามี `orders` → `avgLtv = revenue / orders`
    - ถ้าไม่มี `orders` → fallback `avgLtv = revenue / conversions`
  - CAC: `avgCac = spend / conversions`
  - Ratio: `currentRatio = avgLtv / avgCac`

### 10.2 Trend (Conversion Rate)
ที่มา: `backend/src/controllers/dashboard.controller.ts` → `getTrendDashboard`

- **Conversion Rate (CRM)**
  - สูตร: `(จำนวน lead ที่ status='converted' / lead ทั้งหมด) * 100`

### 10.3 Commerce KPIs
ที่มา: `backend/src/controllers/commerce.controller.ts` → `getCommerceOverview`

- **AOV (Average Order Value)**
  - สูตร: `AOV = revenue / orders`
- **Conversion Rate (commerce)**
  - สูตรที่ใช้ตอนนี้: `(conversions / clicks) * 100`
  - หมายเหตุ: ไม่ใช่ e-commerce conversion rate แบบ session-based (ถ้าต้องการ session-based ต้องมี sessions)

### 10.4 SEO KPIs
ที่มา: `backend/src/controllers/seo.controller.ts`

- **GA4 sessionsTotal**
  - รวม `metric.organicTraffic` จาก `metrics` ที่ `platform='ga4'` และ `campaignId=null`
- **GSC CTR**
  - สูตร: `ctr = clicks / impressions` (เป็น ratio; UI จะ format เป็น % เอง)
- **Avg Position**
  - เฉลี่ยจาก `seo_metrics.metadata.position`

---

## 11) Chat / Support อยู่ตรงไหน (Realtime/History)

### 11.1 Chatbot (Frontend)
ตอนนี้แชทที่มีอยู่เป็น widget จาก n8n:
- File:
  - `frontend/src/components/my-chatbot/src/ChatWidget.jsx`
- วิธีทำงาน:
  - เรียก `createChat()` จาก `@n8n/chat`
  - ส่งข้อความไปที่ `webhookUrl` ของ n8n (external)
- หมายเหตุ:
  - **ไม่ได้เก็บลง DB ของโปรเจคนี้** (ไม่มีตาราง chat/messages ใน PostgreSQL)
  - ถ้าต้องการ “เก็บประวัติแชท/ทำ audit” ต้องเพิ่ม endpoint/ตารางใหม่ หรือให้ n8n callback กลับมาเก็บที่ backend

### 11.2 Support access (Backend)
ระบบ support ที่เพิ่มไว้ล่าสุด:
- Routes:
  - `POST /api/v1/support/request` (admin_full)
  - `GET /api/v1/support/requests` (super_admin)
  - `POST /api/v1/support/approve/:tenantId` (super_admin)
  - `POST /api/v1/support/deny/:tenantId` (super_admin)
- Controller:
  - `backend/src/controllers/support.controller.ts`
- DB:
  - `tenants.support_access` (ต้อง migrate ให้ขึ้นใน DB)
  - `audit_logs` จะถูกเขียนผ่าน `backend/src/utils/audit.ts`

---

## 12) Dashboard End-to-End Guide (ครบเซ็ต: หน้าจอ/การเชื่อม/บทบาท/ช่องว่าง)

### 12.1 Dashboard คืออะไรในระบบนี้ (สำคัญ)
- Dashboard เป็น “หน้าเดียว” ที่สลับ section ด้วย state `activeSection`
- File หลัก: `frontend/src/components/Dashboard.tsx`
- Layout/Sidebar: `frontend/src/components/dashboard/DashboardShell.tsx`
- Sections:
  - `overview` -> `frontend/src/components/dashboard/sections/overviewSection.tsx`
  - `campaign` -> `frontend/src/components/dashboard/sections/campaignSection.tsx`
  - `trend` -> `frontend/src/components/dashboard/sections/trendSection.tsx`
  - `seo` -> `frontend/src/components/dashboard/sections/seoSection.tsx`
  - `commerce` -> `frontend/src/components/dashboard/sections/commerceSection.tsx`
  - `crm` -> `frontend/src/components/dashboard/sections/crmSection.tsx`
  - `settings` -> `frontend/src/components/dashboard/sections/settingsSection.tsx`
  - `reports` -> `frontend/src/components/dashboard/sections/reportsSection.tsx`

### 12.2 Data flow (หน้าจอ ↔ API) แบบละเอียด

#### 12.2.1 Overview
- **UI data source**:
  - `useOverviewData(selectedRange, compareMode, conversionConnectionStatus)`
- **Backend**:
  - `GET /api/v1/dashboard/overview?range=Today|7D|30D`
  - File: `backend/src/routes/dashboard.routes.ts`
- **เสริม**:
  - `GET /api/v1/metrics/platform-breakdown` (ใช้ทำ Revenue Share by Platform)
- **Download ที่ทำได้จริงตอนนี้**:
  - `Active Campaign Monitor` -> CSV สร้างฝั่ง frontend
  - `Conversions Platform` -> CSV สร้างฝั่ง frontend
- **Download ที่ยังไม่ทำ**:
  - Image/PDF/DOC (ขึ้น alert “coming soon”)

#### 12.2.2 Campaign
- **Backend**:
  - `GET /api/v1/campaigns/insights?period=7d|30d|90d|365d`
  - File: `backend/src/routes/campaign.routes.ts`
- **หมายเหตุ**:
  - `/campaigns` (CampaignsPage) เป็นอีกหน้าที่เรียก `GET /api/v1/campaigns`

#### 12.2.3 Trend
- **Backend**:
  - `GET /api/v1/dashboard/trend?period|startDate|endDate`
  - File: `backend/src/routes/dashboard.routes.ts`

#### 12.2.4 SEO
- **Backend**:
  - `GET /api/v1/seo/dashboard?dateFrom&dateTo&limit`
  - File: `backend/src/routes/seo.routes.ts`
- **หมายเหตุ**:
  - UI SEO มี fallback/placeholder เยอะ ต้องเทสว่าฟิลด์ที่ controller ส่ง “ครบตามที่ UI expect”

#### 12.2.5 Commerce
- **Backend**:
  - `GET /api/v1/commerce/overview`
  - `GET /api/v1/commerce/products/performance`
  - File: `backend/src/routes/commerce.routes.ts`

#### 12.2.6 CRM
- **Backend**:
  - `GET /api/v1/crm/leads?status&stage&limit&offset`
  - File: `backend/src/routes/crm.routes.ts`

#### 12.2.7 Reports
- **Backend**:
  - `GET /api/v1/reports`
  - `POST /api/v1/reports`
  - `POST /api/v1/reports/:id/generate`
  - `GET /api/v1/reports/:id/download`
  - File: `backend/src/routes/report.routes.ts`

#### 12.2.8 Settings
- **สถานะปัจจุบัน**:
  - ส่วนใหญ่เป็น “client-side settings” เก็บใน `localStorage` (ผูก tenant+user/role)
- **Backend ที่มีอยู่แล้ว (แต่ dashboard ยังไม่ผูกเข้าตรง ๆ)**:
  - `GET/POST/DELETE /api/v1/settings/json-imports`
  - `GET/POST/DELETE /api/v1/settings/pending/json-imports`
  - File: `backend/src/routes/settings.routes.ts`

### 12.3 RBAC ที่เกี่ยวกับ Dashboard (ความจริงที่ต้องรู้)
- Frontend ใช้ permission guards ใน `App.tsx` + logic ใน `Dashboard.tsx`
- Backend enforce จริงด้วย `authenticate` + `tenantMiddleware` + `requireRole/requirePermission` บาง endpoints
- จุดเสี่ยง: UI บางส่วนพูดถึง “Admin/Analyst/Executive” แต่ระบบจริงใช้ role `admin_full/admin_mess/manager/viewer/...`

### 12.4 Multi-tenant (ความเชื่อมกัน)
- Frontend ใส่ `Authorization` และ `X-Tenant-Id` ในทุก request ผ่าน axios interceptor
- Backend บังคับ tenant ผ่าน `tenantMiddleware` (กัน tenant mismatch)

### 12.5 Gap list (สิ่งที่ต้องเพิ่มเพื่อใช้งานได้ 100%)
- **Settings server-side**: ย้าย KPI thresholds/recipients/refresh/branding ไปเก็บ `tenant_settings` และมี API get/update
- **Download/export**: ทำ export จริงสำหรับ Image/PDF/DOC หรือ map ให้ไปใช้ระบบ report generator
- **Report scheduling**: ถ้าต้อง “ส่งอีเมลอัตโนมัติ” ต้องมี job/cron + audit log
- **Feature flag ตาม MVP**: ถ้า MVP เป็น Ads+GA4 ให้ซ่อน SEO/Commerce/CRM ใน menu หรือทำ Coming soon
- **Provider normalization**: ทำ provider id ให้เป็น canonical (`googleads/ga4/facebook/tiktok/line/shopee`) และใช้ชุดเดียวกันทั้ง UI+DB
