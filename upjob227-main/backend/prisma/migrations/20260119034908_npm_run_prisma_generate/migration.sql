-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "support_access" VARCHAR(20) NOT NULL DEFAULT 'denied';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'active',
ALTER COLUMN "role" SET DEFAULT 'viewer';

-- CreateIndex
CREATE INDEX "tenants_support_access_idx" ON "tenants"("support_access");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");
