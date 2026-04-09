import { PrismaClient } from "@prisma/client";

// Ensure we don't create multiple Prisma instances in dev mode
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// We pass the config explicitly because Turbopack does not magically bundle prisma.config.ts
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Explicitly pass config for Turbopack compatibility 
    // using @ts-ignore to bypass Prisma 7 type mismatch
    // @ts-ignore
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
