import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Ensures the caller is authenticated. Throws an error otherwise.
 * Use this at the beginning of secure Server Actions.
 */
export async function requireAuth() {
  const session = await getSession();
  
  if (!session || !session.id) {
    throw new Error("Unauthorized: Please log in first.");
  }
  
  return session;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth();
  const role = (session.tenantRole || session.role) as Role | undefined;
  
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Forbidden: You do not have permission to perform this action.");
  }
  
  return session;
}

/**
 * Ensures the caller is authenticated AND bound to an active tenant.
 * Automatically resolves tenantId from session or queries user's primary membership.
 */
export async function requireTenantContext() {
  const session = await requireAuth();
  let tenantId = session.tenantId as string | undefined;
  let tenantRole = (session.tenantRole || session.role) as Role | undefined;

  if (!tenantId) {
    // Fallback: look up primary active membership
    const membership = await prisma.tenantUser.findFirst({
      where: { userId: session.id as string },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      // Self-healing fallback to primary default tenant if exists
      const defaultTenant = await prisma.tenant.findFirst({
        where: { slug: "premier-farm" },
      });
      if (defaultTenant) {
        tenantId = defaultTenant.id;
        tenantRole = session.role as Role;
      } else {
        throw new Error("Unauthorized: No farm organization associated with this account.");
      }
    } else {
      tenantId = membership.tenantId;
      tenantRole = membership.role;
    }
  }

  return {
    userId: session.id as string,
    email: session.email as string,
    tenantId,
    tenantRole: tenantRole || "WORKER",
    session,
  };
}

export async function requireTenantRole(allowedRoles: Role[]) {
  const context = await requireTenantContext();
  
  if (!allowedRoles.includes(context.tenantRole as Role)) {
    throw new Error("Forbidden: Your role does not have permission for this farm action.");
  }

  return context;
}

