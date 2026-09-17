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

async function performSeed(prisma, adminEmail, adminPassword) {
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
    await performSeed(client.prisma, adminEmail, adminPassword);
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
        await performSeed(client.prisma, adminEmail, adminPassword);
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
        await performSeed(client.prisma, adminEmail, adminPassword);
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
