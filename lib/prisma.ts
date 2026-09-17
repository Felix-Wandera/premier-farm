import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn("[PRISMA WARNING] DATABASE_URL is not set in environment.");
    }
    const isCloudDb = connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
    const pool = new Pool({
        connectionString,
        ssl: isCloudDb && !connectionString.includes("sslmode=disable") ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma =
    globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
