-- CreateTable
CREATE TABLE "FarmSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "farmName" TEXT NOT NULL DEFAULT 'Premier Farm',
    "location" TEXT NOT NULL DEFAULT 'Nakuru County, Kenya',
    "phoneNumber" TEXT DEFAULT '+254 700 000 000',
    "email" TEXT DEFAULT 'info@premierfarm.com',
    "currencySymbol" TEXT NOT NULL DEFAULT 'KES',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmSetting_pkey" PRIMARY KEY ("id")
);
