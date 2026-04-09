import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";

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

/**
 * Ensures the caller has one of the allowed roles.
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth();
  
  // @ts-ignore
  if (!allowedRoles.includes(session.role as Role)) {
    throw new Error("Forbidden: You do not have permission to perform this action.");
  }
  
  return session;
}
