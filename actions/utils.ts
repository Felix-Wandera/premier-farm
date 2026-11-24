import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaultTenantAndAdmin } from "@/lib/tenant-init";
import {
  PermissionKey,
  resolveEffectivePermissions,
} from "@/lib/permissions";

/**
 * Ensures the caller is authenticated. Throws an error otherwise.
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.id) {
    throw new Error("Unauthorized: Please log in first.");
  }

  return session;
}

export async function requireRole(allowedRoles: Role[]) {
  const context = await requireTenantContext();

  if (!allowedRoles.includes(context.tenantRole)) {
    throw new Error("Forbidden: You do not have permission to perform this action.");
  }

  return context.session;
}

/**
 * Ensures the caller is authenticated AND bound to an active tenant,
 * resolving live role and granular permissions from TenantUser.
 */
export async function requireTenantContext() {
  const session = await requireAuth();
  const userId = session.id as string;
  let tenantId = session.tenantId as string | undefined;

  let membership = tenantId
    ? await prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId,
          },
        },
        include: { tenant: true },
      })
    : null;

  if (!membership) {
    membership = await prisma.tenantUser.findFirst({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });
  }

  let tenantRole: Role = (membership?.role || session.tenantRole || session.role || "WORKER") as Role;
  let customPermissions: unknown = membership?.customPermissions ?? null;

  if (!membership) {
    const { tenant } = await ensureDefaultTenantAndAdmin(
      userId,
      (session.role as Role) || "WORKER"
    );
    tenantId = tenant.id;
    const createdMembership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId,
        },
      },
    });
    tenantRole = createdMembership?.role || (session.role as Role) || "WORKER";
    customPermissions = createdMembership?.customPermissions ?? null;
  } else {
    tenantId = membership.tenantId;
    tenantRole = membership.role;
  }

  const permissions = resolveEffectivePermissions(tenantRole, customPermissions);
  const permissionSet = new Set<PermissionKey>(permissions);

  return {
    userId,
    email: session.email as string,
    tenantId: tenantId!,
    tenantRole,
    isAdmin: tenantRole === "ADMIN",
    permissions,
    hasPermission: (key: PermissionKey) => permissionSet.has(key),
    session,
  };
}

export async function requireTenantRole(allowedRoles: Role[]) {
  const context = await requireTenantContext();

  if (!allowedRoles.includes(context.tenantRole)) {
    throw new Error("Forbidden: Your role does not have permission for this farm action.");
  }

  return context;
}

/**
 * Ensures the caller possesses the required granular permission (or ALL permissions if an array is passed).
 */
export async function requirePermission(required: PermissionKey | PermissionKey[]) {
  const context = await requireTenantContext();
  const keys = Array.isArray(required) ? required : [required];

  for (const key of keys) {
    if (!context.hasPermission(key)) {
      throw new Error(`Forbidden: You do not have the "${key}" permission in this organization.`);
    }
  }

  return context;
}

/**
 * Ensures the caller possesses at least ONE of the specified granular permissions.
 */
export async function requireAnyPermission(options: PermissionKey[]) {
  const context = await requireTenantContext();
  const allowed = options.some((k) => context.hasPermission(k));

  if (!allowed) {
    throw new Error("Forbidden: You lack the required permissions for this action.");
  }

  return context;
}
