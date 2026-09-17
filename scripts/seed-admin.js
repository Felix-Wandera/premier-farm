/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
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

function createClient(databaseUrl, useSsl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

async function performSeed(prisma, adminEmail, adminPassword, pool) {
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  if (existing) {
    const isMatch = await bcrypt.compare(adminPassword, existing.password);
    if (!isMatch || existing.role !== "ADMIN" || existing.isDeleted) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          role: "ADMIN",
          isDeleted: false,
          deletedAt: null,
        },
      });
      console.log(`[SEED SUCCESS] Existing admin updated with active ADMIN role and synchronized password.`);
    } else {
      console.log(`[SEED OK] Admin user already exists and is in sync.`);
    }
  } else {
    const created = await prisma.user.create({
      data: {
        email: adminEmail,
        firstName: "System",
        lastName: "Administrator",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.log(`[SEED SUCCESS] Admin user created with ID: ${created.id}`);
  }

  // Ensure default farm profile and primary tenant exist
  try {
    const defaultFarm = await prisma.farmSetting.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        farmName: "Premier Farm",
        location: "Nakuru County, Kenya",
        phoneNumber: "+254 700 000 000",
        email: "info@premierfarm.com",
        currencySymbol: "KES",
      },
    });
    console.log(`[SEED SUCCESS] Farm settings initialized: ${defaultFarm.farmName} (${defaultFarm.currencySymbol})`);

    const primaryTenant = await prisma.tenant.upsert({
      where: { slug: "premier-farm" },
      update: {},
      create: {
        id: "tenant-premier-farm",
        name: defaultFarm.farmName || "Premier Farm",
        slug: "premier-farm",
        location: defaultFarm.location || "Nakuru County, Kenya",
        phoneNumber: defaultFarm.phoneNumber || "+254 700 000 000",
        email: defaultFarm.email || "info@premierfarm.com",
        currencySymbol: defaultFarm.currencySymbol || "KES",
        status: "ACTIVE",
        plan: "PRO_ENTERPRISE",
      },
    });

    // Ensure all existing users are linked to the primary tenant
    const allUsers = await prisma.user.findMany({ where: { isDeleted: false } });
    for (const u of allUsers) {
      await prisma.tenantUser.upsert({
        where: {
          tenantId_userId: {
            tenantId: primaryTenant.id,
            userId: u.id,
          },
        },
        update: {},
        create: {
          tenantId: primaryTenant.id,
          userId: u.id,
          role: u.role,
        },
      });
    }
    console.log(`[SEED SUCCESS] All ${allUsers.length} user account(s) linked to primary tenant.`);

    // Backfill any remaining domain records missing tenantId
    if (pool) {
      const tables = ["Animal", "MilkLog", "Sale", "BreedingEvent", "HealthRecord", "InventoryItem", "Expense"];
      for (const table of tables) {
        await pool.query(`UPDATE "${table}" SET "tenantId" = $1 WHERE "tenantId" IS NULL`, [primaryTenant.id]).catch(() => {});
      }
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Animal_tenantId_tagNumber_key" ON "Animal"("tenantId", "tagNumber")`).catch(() => {});
    }
  } catch (farmErr) {
    console.warn(`[SEED WARN] Could not seed farm settings/tenant:`, farmErr.message);
  }
}

async function seedAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[SEED SKIP] DATABASE_URL is not set. Skipping admin seed.");
    return;
  }

  const adminEmail = (process.env.TECH_ADMIN_EMAIL || "admin@premierfarm.com").trim().toLowerCase();
  const adminPassword = process.env.TECH_ADMIN_PASSWORD || "admin123";

  console.log(`[SEED START] Ensuring admin user: ${adminEmail}`);

  let useSsl = shouldEnableSsl(databaseUrl);
  let client = createClient(databaseUrl, useSsl);

  try {
    await performSeed(client.prisma, adminEmail, adminPassword, client.pool);
  } catch (error) {
    const errMsg = String(error?.message || error);
    // If TLS error because server doesn't support SSL, retry without SSL
    if (useSsl && (errMsg.includes("does not support SSL") || errMsg.includes("TlsConnectionError"))) {
      console.warn("[SEED WARN] Server does not support SSL. Retrying with plaintext connection...");
      await client.prisma.$disconnect().catch(() => {});
      await client.pool.end().catch(() => {});

      useSsl = false;
      client = createClient(databaseUrl, false);
      try {
        await performSeed(client.prisma, adminEmail, adminPassword, client.pool);
      } catch (retryError) {
        console.error("[SEED ERROR] Failed to seed admin user on retry:", retryError);
      }
    } else if (!useSsl && (errMsg.includes("SSL off") || errMsg.includes("SSL is required") || errMsg.includes("no pg_hba.conf entry"))) {
      console.warn("[SEED WARN] Server requires SSL. Retrying with SSL enabled...");
      await client.prisma.$disconnect().catch(() => {});
      await client.pool.end().catch(() => {});

      useSsl = true;
      client = createClient(databaseUrl, true);
      try {
        await performSeed(client.prisma, adminEmail, adminPassword, client.pool);
      } catch (retryError) {
        console.error("[SEED ERROR] Failed to seed admin user on retry:", retryError);
      }
    } else {
      console.error("[SEED ERROR] Failed to seed admin user:", error);
    }
  } finally {
    await client.prisma.$disconnect().catch(() => {});
    await client.pool.end().catch(() => {});
  }
}

seedAdmin();
