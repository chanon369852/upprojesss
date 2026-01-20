/*
  Warnings:

  - The primary key for the `activity_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `action` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `entity_type` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - The `entity_id` column on the `activity_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `metadata` column on the `activity_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `ip_address` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(45)`.
  - You are about to alter the column `platform` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `status` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The primary key for the `ai_insights` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `campaign_id` column on the `ai_insights` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `insight_type` on the `ai_insights` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `title` on the `ai_insights` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The `analysis` column on the `ai_insights` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `priority` on the `ai_insights` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `status` on the `ai_insights` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The primary key for the `ai_queries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `user_id` column on the `ai_queries` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `language` on the `ai_queries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - The primary key for the `alert_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `metric_value` on the `alert_history` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,4)`.
  - You are about to alter the column `threshold_value` on the `alert_history` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,4)`.
  - The `metadata` column on the `alert_history` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `alerts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `campaign_id` column on the `alerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `name` on the `alerts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `alert_type` on the `alerts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `metric` on the `alerts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `operator` on the `alerts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `threshold` on the `alerts` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,4)`.
  - The `notification_channels` column on the `alerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `recipients` column on the `alerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `user_id` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `action` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `entity_type` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - The `entity_id` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `changes` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `campaigns` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `integration_id` column on the `campaigns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `external_id` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `name` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `platform` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `campaign_type` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `objective` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `status` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `budget` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `budget_type` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `currency` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - The primary key for the `integration_notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `integration_id` column on the `integration_notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `platform` on the `integration_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `severity` on the `integration_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `status` on the `integration_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `title` on the `integration_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `reason` on the `integration_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `action_url` on the `integration_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - The `metadata` column on the `integration_notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `integrations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `type` on the `integrations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `name` on the `integrations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The `config` column on the `integrations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `status` on the `integrations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `provider` on the `integrations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - The primary key for the `metrics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `campaign_id` column on the `metrics` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `platform` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `source` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `spend` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `cost_per_click` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,4)`.
  - You are about to alter the column `cost_per_mille` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,4)`.
  - You are about to alter the column `cost_per_action` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,4)`.
  - You are about to alter the column `ctr` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,4)`.
  - You are about to alter the column `conversion_rate` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,4)`.
  - You are about to alter the column `roas` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,4)`.
  - You are about to alter the column `revenue` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `cart_abandonment_rate` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,4)`.
  - You are about to alter the column `average_order_value` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `bounce_rate` on the `metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,4)`.
  - The `metadata` column on the `metrics` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `oauth_states` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `integration_id` column on the `oauth_states` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `state` on the `oauth_states` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The primary key for the `reports` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `created_by` column on the `reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `name` on the `reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `report_type` on the `reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `date_range_type` on the `reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The `filters` column on the `reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `metrics` column on the `reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `schedule_frequency` on the `reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `export_format` on the `reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `name` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - The `permissions` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `token` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - The primary key for the `sync_histories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `integration_id` column on the `sync_histories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `platform` on the `sync_histories` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `status` on the `sync_histories` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The `data` column on the `sync_histories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `tenant_kpis` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `section` on the `tenant_kpis` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `metric` on the `tenant_kpis` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `condition` on the `tenant_kpis` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `threshold` on the `tenant_kpis` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,4)`.
  - You are about to alter the column `threshold_text` on the `tenant_kpis` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The primary key for the `tenants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ui_assets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `tenant_id` column on the `ui_assets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `name` on the `ui_assets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `category` on the `ui_assets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `description` on the `ui_assets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `file_name` on the `ui_assets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `file_path` on the `ui_assets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `thumbnail` on the `ui_assets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - The `tags` column on the `ui_assets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `email` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `password_hash` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `first_name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `last_name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `phone` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `admin_type` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `last_login_ip` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(45)`.
  - The primary key for the `webhook_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `platform` on the `webhook_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `type` on the `webhook_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `signature` on the `webhook_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - A unique constraint covering the columns `[tenant_id,metricType,external_key]` on the table `seo_metrics` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `id` on the `activity_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `activity_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `activity_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ai_insights` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `ai_insights` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ai_queries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `ai_queries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `alert_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `alert_id` on the `alert_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `alert_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `alerts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `alerts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `campaigns` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `campaigns` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `integration_notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `integration_notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `integrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `integrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `credentials` on the `integrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `metrics` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `metrics` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `oauth_states` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `reports` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `reports` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `sync_histories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `sync_histories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `tenant_kpis` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `tenant_kpis` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `tenants` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ui_assets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `webhook_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `webhook_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `data` on the `webhook_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_insights" DROP CONSTRAINT "ai_insights_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_insights" DROP CONSTRAINT "ai_insights_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_queries" DROP CONSTRAINT "ai_queries_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_queries" DROP CONSTRAINT "ai_queries_user_id_fkey";

-- DropForeignKey
ALTER TABLE "alert_history" DROP CONSTRAINT "alert_history_alert_id_fkey";

-- DropForeignKey
ALTER TABLE "alert_history" DROP CONSTRAINT "alert_history_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_integration_id_fkey";

-- DropForeignKey
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "integration_notifications" DROP CONSTRAINT "integration_notifications_integration_id_fkey";

-- DropForeignKey
ALTER TABLE "integration_notifications" DROP CONSTRAINT "integration_notifications_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "metrics" DROP CONSTRAINT "metrics_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "metrics" DROP CONSTRAINT "metrics_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "oauth_states" DROP CONSTRAINT "oauth_states_integration_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_created_by_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sync_histories" DROP CONSTRAINT "sync_histories_integration_id_fkey";

-- DropForeignKey
ALTER TABLE "sync_histories" DROP CONSTRAINT "sync_histories_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_kpis" DROP CONSTRAINT "tenant_kpis_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ui_assets" DROP CONSTRAINT "ui_assets_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "webhook_events" DROP CONSTRAINT "webhook_events_tenant_id_fkey";

-- AlterTable
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ALTER COLUMN "action" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "entity_type" SET DATA TYPE VARCHAR(50),
DROP COLUMN "entity_id",
ADD COLUMN     "entity_id" UUID,
DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ALTER COLUMN "ip_address" SET DATA TYPE VARCHAR(45),
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ai_insights" DROP CONSTRAINT "ai_insights_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "campaign_id",
ADD COLUMN     "campaign_id" UUID,
ALTER COLUMN "insight_type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "title" SET DATA TYPE VARCHAR(255),
DROP COLUMN "analysis",
ADD COLUMN     "analysis" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "priority" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ai_queries" DROP CONSTRAINT "ai_queries_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID,
ALTER COLUMN "language" SET DATA TYPE VARCHAR(5),
ADD CONSTRAINT "ai_queries_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "alert_history" DROP CONSTRAINT "alert_history_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "alert_id",
ADD COLUMN     "alert_id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "metric_value" SET DATA TYPE DECIMAL(15,4),
ALTER COLUMN "threshold_value" SET DATA TYPE DECIMAL(15,4),
DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "campaign_id",
ADD COLUMN     "campaign_id" UUID,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "alert_type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "metric" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "operator" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "threshold" SET DATA TYPE DECIMAL(15,4),
DROP COLUMN "notification_channels",
ADD COLUMN     "notification_channels" JSONB NOT NULL DEFAULT '["email"]',
DROP COLUMN "recipients",
ADD COLUMN     "recipients" JSONB NOT NULL DEFAULT '[]',
ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID,
ALTER COLUMN "action" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "entity_type" SET DATA TYPE VARCHAR(50),
DROP COLUMN "entity_id",
ADD COLUMN     "entity_id" UUID,
DROP COLUMN "changes",
ADD COLUMN     "changes" JSONB,
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "integration_id",
ADD COLUMN     "integration_id" UUID,
ALTER COLUMN "external_id" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "campaign_type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "objective" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "budget" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "budget_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "start_date" SET DATA TYPE DATE,
ALTER COLUMN "end_date" SET DATA TYPE DATE,
ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "integration_notifications" DROP CONSTRAINT "integration_notifications_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "integration_id",
ADD COLUMN     "integration_id" UUID,
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "severity" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "title" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "reason" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "action_url" SET DATA TYPE VARCHAR(500),
DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD CONSTRAINT "integration_notifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
DROP COLUMN "credentials",
ADD COLUMN     "credentials" JSONB NOT NULL,
DROP COLUMN "config",
ADD COLUMN     "config" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "provider" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "metrics" DROP CONSTRAINT "metrics_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "campaign_id",
ADD COLUMN     "campaign_id" UUID,
ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "source" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "spend" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "cost_per_click" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "cost_per_mille" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "cost_per_action" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "ctr" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "conversion_rate" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "roas" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "revenue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "cart_abandonment_rate" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "average_order_value" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "bounce_rate" SET DATA TYPE DECIMAL(8,4),
DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD CONSTRAINT "metrics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "oauth_states" DROP CONSTRAINT "oauth_states_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "integration_id",
ADD COLUMN     "integration_id" UUID,
ALTER COLUMN "state" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reports" DROP CONSTRAINT "reports_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "created_by",
ADD COLUMN     "created_by" UUID,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "report_type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "date_range_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "start_date" SET DATA TYPE DATE,
ALTER COLUMN "end_date" SET DATA TYPE DATE,
DROP COLUMN "filters",
ADD COLUMN     "filters" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "metrics",
ADD COLUMN     "metrics" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "schedule_frequency" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "export_format" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "schedule_time" SET DATA TYPE TIME(6),
ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
DROP COLUMN "permissions",
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '[]',
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "seo_metrics" ADD COLUMN     "date" DATE,
ADD COLUMN     "external_key" VARCHAR(500);

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ALTER COLUMN "token" SET DATA TYPE VARCHAR(500),
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sync_histories" DROP CONSTRAINT "sync_histories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
DROP COLUMN "integration_id",
ADD COLUMN     "integration_id" UUID,
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
DROP COLUMN "data",
ADD COLUMN     "data" JSONB,
ADD CONSTRAINT "sync_histories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tenant_kpis" DROP CONSTRAINT "tenant_kpis_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "section" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "metric" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "condition" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "threshold" SET DATA TYPE DECIMAL(15,4),
ALTER COLUMN "threshold_text" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "tenant_kpis_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ui_assets" DROP CONSTRAINT "ui_assets_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "file_name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "file_path" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "thumbnail" SET DATA TYPE VARCHAR(500),
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '[]',
ADD CONSTRAINT "ui_assets_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "first_name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "last_name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "role" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "admin_type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "last_login_ip" SET DATA TYPE VARCHAR(45),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "webhook_events" DROP CONSTRAINT "webhook_events_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(100),
DROP COLUMN "data",
ADD COLUMN     "data" JSONB NOT NULL,
ALTER COLUMN "signature" SET DATA TYPE VARCHAR(500),
ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_states" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "cursor" JSONB NOT NULL DEFAULT '{}',
    "last_attempt_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "trigger" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "locked_at" TIMESTAMP(3),
    "locked_by" VARCHAR(100),
    "payload" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_settings_tenant_id_idx" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_settings_key_idx" ON "tenant_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key_key" ON "tenant_settings"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "integration_sync_states_integration_id_key" ON "integration_sync_states"("integration_id");

-- CreateIndex
CREATE INDEX "integration_sync_states_tenant_id_idx" ON "integration_sync_states"("tenant_id");

-- CreateIndex
CREATE INDEX "integration_sync_states_provider_idx" ON "integration_sync_states"("provider");

-- CreateIndex
CREATE INDEX "ingestion_jobs_tenant_id_status_run_at_idx" ON "ingestion_jobs"("tenant_id", "status", "run_at");

-- CreateIndex
CREATE INDEX "ingestion_jobs_integration_id_status_idx" ON "ingestion_jobs"("integration_id", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_provider_idx" ON "ingestion_jobs"("provider");

-- CreateIndex
CREATE INDEX "activity_logs_tenant_id_idx" ON "activity_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "ai_insights_tenant_id_idx" ON "ai_insights"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_insights_campaign_id_idx" ON "ai_insights"("campaign_id");

-- CreateIndex
CREATE INDEX "ai_queries_tenant_id_idx" ON "ai_queries"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_queries_user_id_idx" ON "ai_queries"("user_id");

-- CreateIndex
CREATE INDEX "alert_history_alert_id_idx" ON "alert_history"("alert_id");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_idx" ON "alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "campaigns_tenant_id_idx" ON "campaigns"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_tenant_id_platform_external_id_key" ON "campaigns"("tenant_id", "platform", "external_id");

-- CreateIndex
CREATE INDEX "integration_notifications_tenant_id_idx" ON "integration_notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "integration_notifications_integration_id_idx" ON "integration_notifications"("integration_id");

-- CreateIndex
CREATE INDEX "integrations_tenant_id_idx" ON "integrations"("tenant_id");

-- CreateIndex
CREATE INDEX "metrics_tenant_id_date_idx" ON "metrics"("tenant_id", "date" DESC);

-- CreateIndex
CREATE INDEX "metrics_campaign_id_date_idx" ON "metrics"("campaign_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "metrics_tenant_id_campaign_id_date_hour_platform_source_key" ON "metrics"("tenant_id", "campaign_id", "date", "hour", "platform", "source");

-- CreateIndex
CREATE INDEX "oauth_states_integration_id_idx" ON "oauth_states"("integration_id");

-- CreateIndex
CREATE INDEX "reports_tenant_id_idx" ON "reports"("tenant_id");

-- CreateIndex
CREATE INDEX "reports_created_by_idx" ON "reports"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "seo_metrics_tenant_id_metricType_date_idx" ON "seo_metrics"("tenant_id", "metricType", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "seo_metrics_tenant_id_metricType_external_key_key" ON "seo_metrics"("tenant_id", "metricType", "external_key");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sync_histories_tenant_id_idx" ON "sync_histories"("tenant_id");

-- CreateIndex
CREATE INDEX "sync_histories_integration_id_idx" ON "sync_histories"("integration_id");

-- CreateIndex
CREATE INDEX "tenant_kpis_tenant_id_idx" ON "tenant_kpis"("tenant_id");

-- CreateIndex
CREATE INDEX "ui_assets_tenant_id_idx" ON "ui_assets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ui_assets_tenant_id_file_name_key" ON "ui_assets"("tenant_id", "file_name");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "webhook_events_tenant_id_idx" ON "webhook_events"("tenant_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_metrics" ADD CONSTRAINT "seo_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_kpis" ADD CONSTRAINT "tenant_kpis_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ui_assets" ADD CONSTRAINT "ui_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_states" ADD CONSTRAINT "integration_sync_states_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_states" ADD CONSTRAINT "integration_sync_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_queries" ADD CONSTRAINT "ai_queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_queries" ADD CONSTRAINT "ai_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_histories" ADD CONSTRAINT "sync_histories_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_histories" ADD CONSTRAINT "sync_histories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_notifications" ADD CONSTRAINT "integration_notifications_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_notifications" ADD CONSTRAINT "integration_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
