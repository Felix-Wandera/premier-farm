/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,tagNumber]` on the table `Animal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[expenseId]` on the table `InventoryTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[saleId]` on the table `InventoryTransaction` will be added. If there are existing duplicate values, this will fail.
  - Made the column `name` on table `Animal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Animal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `BreedingEvent` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `HealthRecord` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `InventoryItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `MilkLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Sale` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "MilkingTime" ADD VALUE 'MIDDAY';

-- AlterTable
ALTER TABLE "Animal" ALTER COLUMN "tagNumber" DROP NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "BreedingEvent" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FarmSetting" ALTER COLUMN "farmName" SET DEFAULT 'Premier Ranch';

-- AlterTable
ALTER TABLE "HealthRecord" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "linkToFinance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unitCost" DOUBLE PRECISION,
ADD COLUMN     "unitRevenue" DOUBLE PRECISION,
ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "saleId" TEXT;

-- AlterTable
ALTER TABLE "MilkLog" ADD COLUMN     "recordDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Animal_tenantId_tagNumber_key" ON "Animal"("tenantId", "tagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_expenseId_key" ON "InventoryTransaction"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_saleId_key" ON "InventoryTransaction"("saleId");

-- CreateIndex
CREATE INDEX "MilkLog_tenantId_animalId_recordDate_milkingTime_idx" ON "MilkLog"("tenantId", "animalId", "recordDate", "milkingTime");

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
