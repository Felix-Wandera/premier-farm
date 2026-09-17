/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

function shouldEnableSsl(connectionString) {
  if (
    connectionString.includes("sslmode=disable") ||
    process.env.DATABASE_SSL === "false" ||
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1")
  ) {
    return false;
  }

  if (
    connectionString.includes("sslmode=require") ||
    connectionString.includes("sslmode=prefer") ||
    connectionString.includes("sslmode=verify-ca") ||
    connectionString.includes("sslmode=verify-full") ||
    connectionString.includes("ssl=true") ||
    process.env.DATABASE_SSL === "true"
  ) {
    return true;
  }

  return false;
}

function createClient(databaseUrl) {
  const useSsl = shouldEnableSsl(databaseUrl);
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

async function migrateData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { prisma, pool } = createClient(databaseUrl);

  try {
    console.log("[MIGRATION START] Ensuring primary default tenant exists...");

    // 1. Fetch current FarmSetting if exists to keep custom names/currency
    const farmSetting = await prisma.farmSetting.findUnique({
      where: { id: "default" },
    }).catch(() => null);

    const farmName = farmSetting?.farmName || "Premier Farm";
    const location = farmSetting?.location || "Nakuru County, Kenya";
    const phoneNumber = farmSetting?.phoneNumber || "+254 700 000 000";
    const email = farmSetting?.email || "info@premierfarm.com";
    const currencySymbol = farmSetting?.currencySymbol || "KES";

    // 2. Upsert the default Tenant record
    const primaryTenant = await prisma.tenant.upsert({
      where: { slug: "premier-farm" },
      update: {
        name: farmName,
        location,
        phoneNumber,
        email,
        currencySymbol,
      },
      create: {
        id: "tenant-premier-farm",
        name: farmName,
        slug: "premier-farm",
        location,
        phoneNumber,
        email,
        currencySymbol,
        status: "ACTIVE",
        plan: "PRO_ENTERPRISE",
      },
    });

    console.log(`[MIGRATION] Primary tenant established: ${primaryTenant.name} (ID: ${primaryTenant.id})`);

    // 3. Link all existing users to the primary tenant via TenantUser memberships
    const allUsers = await prisma.user.findMany({
      where: { isDeleted: false },
    });

    console.log(`[MIGRATION] Linking ${allUsers.length} user(s) to primary tenant...`);
    for (const u of allUsers) {
      await prisma.tenantUser.upsert({
        where: {
          tenantId_userId: {
            tenantId: primaryTenant.id,
            userId: u.id,
          },
        },
        update: {
          role: u.role,
        },
        create: {
          tenantId: primaryTenant.id,
          userId: u.id,
          role: u.role,
        },
      });
    }

    // 4. Update all domain records with null tenantId to primaryTenant.id
    const tenantId = primaryTenant.id;

    const animals = await prisma.animal.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`[MIGRATION] Updated ${animals.count} animal(s) with tenantId.`);

    const milkLogs = await prisma.milkLog.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`[MIGRATION] Updated ${milkLogs.count} milk log(s) with tenantId.`);

    const sales = await prisma.sale.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`[MIGRATION] Updated ${sales.count} sale(s) with tenantId.`);

    const breeding = await prisma.breedingEvent.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`[MIGRATION] Updated ${breeding.count} breeding event(s) with tenantId.`);

    const health = await prisma.healthRecord.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`[MIGRATION] Updated ${health.count} health record(s) with tenantId.`);

    const inventory = await prisma.inventoryItem.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`[MIGRATION] Updated ${inventory.count} inventory item(s) with tenantId.`);

    const expenses = await prisma.expense.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`[MIGRATION] Updated ${expenses.count} expense(s) with tenantId.`);

    console.log("[MIGRATION COMPLETE] All existing data successfully migrated into the primary tenant!");
  } catch (error) {
    console.error("[MIGRATION ERROR] Failed to migrate data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
}

migrateData();
