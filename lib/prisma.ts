import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const shouldEnableSsl = (connectionString: string): boolean => {
    // If explicitly disabled
    if (
        connectionString.includes("sslmode=disable") ||
        process.env.DATABASE_SSL === "false" ||
        connectionString.includes("localhost") ||
        connectionString.includes("127.0.0.1")
    ) {
        return false;
    }

    // If explicitly requested via sslmode, ssl param, or env var
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

    // Default to false for internal Docker/Coolify containers and local networks
    return false;
};

const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn("[PRISMA WARNING] DATABASE_URL is not set in environment.");
    }
    const useSsl = connectionString ? shouldEnableSsl(connectionString) : false;
    const pool = new Pool({
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
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
