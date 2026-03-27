-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'WORKER');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('DAIRY_COW', 'INDIGENOUS_COW', 'SHEEP', 'GOAT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('ACTIVE', 'SOLD', 'DECEASED', 'SICK');

-- CreateEnum
CREATE TYPE "MilkingTime" AS ENUM ('MORNING', 'EVENING', 'OTHER');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('MILK', 'ANIMAL', 'OTHER');

-- CreateEnum
CREATE TYPE "BreedingEventType" AS ENUM ('INSEMINATION', 'NATURAL_MATING', 'PREGNANCY_CHECK', 'BIRTH');

-- CreateEnum
CREATE TYPE "HealthRecordType" AS ENUM ('VACCINATION', 'TREATMENT', 'CHECKUP');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('FEED', 'MEDICINE', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('STOCK_IN', 'STOCK_OUT');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('INVENTORY_PURCHASE', 'LABOR', 'VET_SERVICES', 'MAINTENANCE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "tagNumber" TEXT NOT NULL,
    "name" TEXT,
    "species" "Species" NOT NULL,
    "breed" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender" NOT NULL,
    "status" "AnimalStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateOfDeath" TIMESTAMP(3),
    "causeOfDeath" TEXT,
    "saleId" TEXT,
    "motherId" TEXT,
    "fatherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkLog" (
    "id" TEXT NOT NULL,
    "amountLiters" DOUBLE PRECISION NOT NULL,
    "milkingTime" "MilkingTime" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "animalId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MilkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "saleType" "SaleType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreedingEvent" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "eventType" "BreedingEventType" NOT NULL,
    "sireDetails" TEXT,
    "expectedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "notes" TEXT,
    "animalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BreedingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordType" "HealthRecordType" NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "animalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "minThreshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_tagNumber_key" ON "Animal"("tagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_saleId_key" ON "Animal"("saleId");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkLog" ADD CONSTRAINT "MilkLog_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkLog" ADD CONSTRAINT "MilkLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedingEvent" ADD CONSTRAINT "BreedingEvent_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
