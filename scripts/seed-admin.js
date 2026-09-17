/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function seedAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[SEED SKIP] DATABASE_URL is not set. Skipping admin seed.");
    return;
  }

  const adminEmail = (process.env.TECH_ADMIN_EMAIL || "admin@premierfarm.com").trim().toLowerCase();
  const adminPassword = process.env.TECH_ADMIN_PASSWORD || "admin123";

  console.log(`[SEED START] Ensuring admin user: ${adminEmail}`);

  const isCloudDb = databaseUrl && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isCloudDb && !databaseUrl.includes("sslmode=disable") ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
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
  } catch (error) {
    console.error("[SEED ERROR] Failed to seed admin user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedAdmin();
