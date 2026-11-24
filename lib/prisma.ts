import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { createRequire } from "module";
import path from "path";

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

interface RuntimeModelShape {
  _runtimeDataModel?: {
    models?: {
      TenantUser?: {
        fields?: Array<{ name: string }>;
      };
    };
  };
}

function clientHasLatestSchema(client: PrismaClient | undefined): client is PrismaClient {
  if (!client) return false;
  const fields = (client as unknown as RuntimeModelShape)._runtimeDataModel?.models?.TenantUser
    ?.fields;
  if (!Array.isArray(fields)) return true;
  return fields.some((f) => f.name === "customPermissions");
}

function resolveFreshPrismaConstructor(): typeof PrismaClient {
  if (process.env.NODE_ENV !== "production") {
    try {
      const req = createRequire(path.join(process.cwd(), "package.json"));
      const mod = req("@prisma/client") as {
        PrismaClient: typeof PrismaClient;
        Prisma?: {
          dmmf?: {
            datamodel?: {
              models?: Array<{ name: string; fields?: Array<{ name: string }> }>;
            };
          };
        };
      };
      const tenantUserModel = mod.Prisma?.dmmf?.datamodel?.models?.find(
        (m) => m.name === "TenantUser"
      );
      const hasCustomPerms = tenantUserModel?.fields?.some(
        (f) => f.name === "customPermissions"
      );

      if (tenantUserModel && !hasCustomPerms && req.cache) {
        for (const cacheKey of Object.keys(req.cache)) {
          if (cacheKey.includes(".prisma") || cacheKey.includes("@prisma")) {
            delete req.cache[cacheKey];
          }
        }
        const reloaded = req("@prisma/client") as { PrismaClient: typeof PrismaClient };
        return reloaded.PrismaClient;
      }
      return mod.PrismaClient || PrismaClient;
    } catch {
      return PrismaClient;
    }
  }
  return PrismaClient;
}

const prismaClientSingleton = (): PrismaClient => {
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
  const ClientCtor = resolveFreshPrismaConstructor();
  return new ClientCtor({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
  prismaPremierV2: PrismaClientSingleton | undefined;
};

export const prisma: PrismaClientSingleton = clientHasLatestSchema(globalForPrisma.prismaPremierV2)
  ? globalForPrisma.prismaPremierV2
  : prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPremierV2 = prisma;
  globalForPrisma.prisma = prisma;
}
