/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
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

async function applyConstraints() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: shouldEnableSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log("[CONSTRAINTS] Enforcing NOT NULL and compound unique constraints...");

    await pool.query(`
      ALTER TABLE "Animal" ALTER COLUMN "tenantId" SET NOT NULL;
      ALTER TABLE "MilkLog" ALTER COLUMN "tenantId" SET NOT NULL;
      ALTER TABLE "Sale" ALTER COLUMN "tenantId" SET NOT NULL;
      ALTER TABLE "BreedingEvent" ALTER COLUMN "tenantId" SET NOT NULL;
      ALTER TABLE "HealthRecord" ALTER COLUMN "tenantId" SET NOT NULL;
      ALTER TABLE "InventoryItem" ALTER COLUMN "tenantId" SET NOT NULL;
      ALTER TABLE "Expense" ALTER COLUMN "tenantId" SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS "Animal_tenantId_tagNumber_key" ON "Animal"("tenantId", "tagNumber");
    `);

    console.log("[CONSTRAINTS] Successfully enforced NOT NULL and compound unique indexes!");
  } catch (error) {
    console.error("[CONSTRAINTS ERROR]:", error.message);
  } finally {
    await pool.end().catch(() => {});
  }
}

applyConstraints();
