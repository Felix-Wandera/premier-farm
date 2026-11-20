import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";

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
        { slug: "premier-farm" },
        { slug: "premier-ranch" },
        { status: "ACTIVE" },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // If no tenant exists at all, initialize the default primary tenant
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: "tenant-premier-ranch",
        name: "Premier Ranch",
        slug: "premier-ranch",
        location: "Nakuru County, Kenya",
        phoneNumber: "+254 700 000 000",
        email: "info@premierfarm.com",
        currencySymbol: "KES",
        status: "ACTIVE",
        plan: "PRO_ENTERPRISE",
      },
    });
  }

  // Ensure default FarmSetting exists
  await prisma.farmSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      farmName: tenant.name || "Premier Ranch",
      location: tenant.location || "Nakuru County, Kenya",
      phoneNumber: tenant.phoneNumber || "+254 700 000 000",
      email: tenant.email || "info@premierfarm.com",
      currencySymbol: tenant.currencySymbol || "KES",
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
