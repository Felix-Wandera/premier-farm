-- AlterEnum: Add FEED to ExpenseCategory
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'FEED';

-- AlterTable: Add customPermissions JSONB column to TenantUser
ALTER TABLE "TenantUser" ADD COLUMN IF NOT EXISTS "customPermissions" JSONB;

-- AlterTable: Update Tenant & FarmSetting defaults to Premier Ranch Kitale
ALTER TABLE "Tenant" ALTER COLUMN "name" SET DEFAULT 'Premier Ranch Kitale',
ALTER COLUMN "location" SET DEFAULT 'Kitale, Trans-Nzoia County, Kenya';

ALTER TABLE "FarmSetting" ALTER COLUMN "farmName" SET DEFAULT 'Premier Ranch Kitale',
ALTER COLUMN "location" SET DEFAULT 'Kitale, Trans-Nzoia County, Kenya';

-- Backfill legacy default organization names & locations where unmodified
UPDATE "FarmSetting"
SET "farmName" = 'Premier Ranch Kitale'
WHERE "farmName" IN ('Premier Farm', 'Premier Ranch');

UPDATE "FarmSetting"
SET "location" = 'Kitale, Trans-Nzoia County, Kenya'
WHERE "location" IN ('Nakuru County, Kenya', 'Kenya');

UPDATE "Tenant"
SET "name" = 'Premier Ranch Kitale'
WHERE "name" IN ('Premier Farm', 'Premier Ranch');

UPDATE "Tenant"
SET "location" = 'Kitale, Trans-Nzoia County, Kenya'
WHERE "location" IN ('Nakuru County, Kenya', 'Kenya')
  AND "slug" IN ('premier-farm', 'premier-ranch', 'premier-ranch-kitale');

-- Normalize existing whitespace on Animal names/tags and InventoryItem names
UPDATE "Animal" SET "name" = BTRIM("name") WHERE "name" <> BTRIM("name");
UPDATE "Animal" SET "tagNumber" = NULLIF(BTRIM("tagNumber"), '') WHERE "tagNumber" IS NOT NULL;
UPDATE "InventoryItem" SET "name" = BTRIM("name") WHERE "name" <> BTRIM("name");

-- Deduplicate any legacy case-insensitive Animal name collisions among non-deleted rows before creating unique index
WITH ranked_animals AS (
  SELECT "id", "name",
         ROW_NUMBER() OVER (PARTITION BY "tenantId", LOWER(BTRIM("name")) ORDER BY "createdAt" ASC) AS rn
  FROM "Animal"
  WHERE "isDeleted" = false
)
UPDATE "Animal" a
SET "name" = a."name" || ' (' || r.rn || ')'
FROM ranked_animals r
WHERE a."id" = r."id" AND r.rn > 1;

-- Deduplicate any legacy case-insensitive InventoryItem name collisions among non-deleted rows
WITH ranked_items AS (
  SELECT "id", "name",
         ROW_NUMBER() OVER (PARTITION BY "tenantId", LOWER(BTRIM("name")) ORDER BY "createdAt" ASC) AS rn
  FROM "InventoryItem"
  WHERE "isDeleted" = false
)
UPDATE "InventoryItem" i
SET "name" = i."name" || ' (' || r.rn || ')'
FROM ranked_items r
WHERE i."id" = r."id" AND r.rn > 1;

-- Replace strict Animal_tenantId_tagNumber_key with partial case-insensitive index so soft-deleted tags are reusable
DROP INDEX IF EXISTS "Animal_tenantId_tagNumber_key";

-- Supporting standard indexes matching Prisma schema
CREATE INDEX IF NOT EXISTS "Animal_tenantId_name_idx" ON "Animal"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Animal_tenantId_tagNumber_idx" ON "Animal"("tenantId", "tagNumber");

-- Partial unique functional indexes (soft-deleted records free up names and ear tags; SOLD/DECEASED remain protected)
CREATE UNIQUE INDEX IF NOT EXISTS "Animal_tenantId_normalized_name_key"
  ON "Animal" ("tenantId", LOWER(BTRIM("name")))
  WHERE "isDeleted" = false;

CREATE UNIQUE INDEX IF NOT EXISTS "Animal_tenantId_normalized_tag_key"
  ON "Animal" ("tenantId", UPPER(BTRIM("tagNumber")))
  WHERE "isDeleted" = false AND "tagNumber" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_tenantId_normalized_name_key"
  ON "InventoryItem" ("tenantId", LOWER(BTRIM("name")))
  WHERE "isDeleted" = false;
