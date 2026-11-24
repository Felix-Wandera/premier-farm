import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  APP_BRAND_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_FARM_EMAIL,
  DEFAULT_FARM_LOCATION,
  DEFAULT_FARM_PHONE,
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_SLUG,
} from "@/lib/branding";

/**
 * Ensures a default / primary organization (Tenant) and FarmSetting exist,
 * and ensures TECH_ADMIN_EMAIL is created and auto-associated to the organization.
 * Optionally associates a targetUserId as well if they lack membership.
 */
export async function ensureDefaultTenantAndAdmin(
  targetUserId?: string,
  targetUserRole?: Role
) {
  // 1. Find the primary or first existing tenant, or look for default slugs
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: DEFAULT_TENANT_SLUG },
        { slug: "premier-ranch" },
        { slug: "premier-farm" },
        { status: "ACTIVE" },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // If no tenant exists at all, initialize the default primary tenant
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: DEFAULT_TENANT_ID,
        name: APP_BRAND_NAME,
        slug: DEFAULT_TENANT_SLUG,
        location: DEFAULT_FARM_LOCATION,
        phoneNumber: DEFAULT_FARM_PHONE,
        email: DEFAULT_FARM_EMAIL,
        currencySymbol: DEFAULT_CURRENCY,
        status: "ACTIVE",
        plan: "PRO_ENTERPRISE",
      },
    });
  } else if (tenant.name === "Premier Ranch" || tenant.name === "Premier Farm") {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: APP_BRAND_NAME,
        location:
          !tenant.location || tenant.location === "Nakuru County, Kenya" || tenant.location === "Kenya"
            ? DEFAULT_FARM_LOCATION
            : tenant.location,
      },
    });
  }

  // Ensure default FarmSetting exists and mirrors primary tenant
  await prisma.farmSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      farmName: tenant.name || APP_BRAND_NAME,
      location: tenant.location || DEFAULT_FARM_LOCATION,
      phoneNumber: tenant.phoneNumber || DEFAULT_FARM_PHONE,
      email: tenant.email || DEFAULT_FARM_EMAIL,
      currencySymbol: tenant.currencySymbol || DEFAULT_CURRENCY,
    },
  });

  // 2. Ensure TECH_ADMIN_EMAIL user exists and is linked
  const techAdminEmail = (process.env.TECH_ADMIN_EMAIL || "admin@premierfarm.com").trim().toLowerCase();
  const techAdminPassword = process.env.TECH_ADMIN_PASSWORD || "admin123";

  let adminUser = await prisma.user.findUnique({
    where: { email: techAdminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await hashPassword(techAdminPassword);
    adminUser = await prisma.user.create({
      data: {
        email: techAdminEmail,
        firstName: "System",
        lastName: "Administrator",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
  }

  // Link TECH_ADMIN to this primary tenant as ADMIN
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: adminUser.id,
      },
    },
    update: {
      role: "ADMIN",
    },
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: "ADMIN",
    },
  });

  // 3. If a specific target user was passed in and lacks membership, auto-associate them
  if (targetUserId) {
    const userRole = targetUserRole || (adminUser.id === targetUserId ? "ADMIN" : "WORKER");
    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: targetUserId,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: targetUserId,
        role: userRole,
      },
    });
  }

  return { tenant, adminUser };
}
