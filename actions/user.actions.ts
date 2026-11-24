"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/mail";
import crypto from "crypto";
import { APP_BRAND_NAME } from "@/lib/branding";
import {
  ALL_PERMISSION_KEYS,
  computePermissionOverridesDiff,
  hasCustomPermissionOverrides,
  parseCustomPermissions,
  PermissionKey,
  resolveEffectivePermissions,
  resolvePermissionMap,
} from "@/lib/permissions";

export async function getUsers() {
  const { tenantId } = await requirePermission("users:manage");

  const memberships = await prisma.tenantUser.findMany({
    where: {
      tenantId,
      user: { isDeleted: false },
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          inviteToken: true,
          inviteTokenExp: true,
        },
      },
    },
  });

  const now = new Date();

  return memberships.map((m) => {
    const u = m.user;
    const inviteToken = m.inviteToken || u.inviteToken;
    const inviteTokenExp = m.inviteTokenExp || u.inviteTokenExp;
    const isPending = !!inviteToken;
    const isExpired = isPending && !!inviteTokenExp && inviteTokenExp < now;
    let expiryRemainingText: string | null = null;

    if (isPending && inviteTokenExp) {
      if (isExpired) {
        expiryRemainingText = "Expired";
      } else {
        const diffHours = Math.round(
          (inviteTokenExp.getTime() - now.getTime()) / (1000 * 60 * 60)
        );
        if (diffHours < 24) {
          expiryRemainingText = `Expires in ${Math.max(1, diffHours)}h`;
        } else {
          const diffDays = Math.round(diffHours / 24);
          expiryRemainingText = `Expires in ${diffDays}d`;
        }
      }
    }

    const customPermissions = parseCustomPermissions(m.customPermissions);
    const effectiveMap = resolvePermissionMap(m.role, customPermissions);
    const effectivePermissions = resolveEffectivePermissions(m.role, customPermissions);
    const hasCustom = hasCustomPermissionOverrides(m.role, customPermissions);

    return {
      id: u.id,
      name: u.firstName
        ? `${u.firstName} ${u.lastName || ""}`.trim()
        : u.email.split("@")[0].replace(".", " "),
      email: u.email,
      role: m.role,
      customPermissions,
      permissionMap: effectiveMap,
      effectivePermissions,
      hasCustomPermissions: hasCustom,
      lastActive: u.createdAt.toLocaleDateString(),
      isPending,
      isExpired,
      expiryText: expiryRemainingText,
    };
  });
}

const inviteSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  role: z.enum(["ADMIN", "MANAGER", "WORKER"]),
  permissionMap: z.record(z.string(), z.boolean()).optional(),
});

export async function inviteUser(data: any) {
  try {
    const { tenantId } = await requirePermission("users:manage");

    const val = inviteSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid email or role." };
    }

    const email = val.data.email.toLowerCase();
    const { role, permissionMap } = val.data;

    const overrides = permissionMap
      ? computePermissionOverridesDiff(role, permissionMap as Partial<Record<PermissionKey, boolean>>)
      : {};
    const customJson = Object.keys(overrides).length > 0 ? overrides : undefined;

    let user = await prisma.user.findUnique({ where: { email } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: role as any,
          password: await bcrypt.hash(crypto.randomUUID(), 10),
          inviteToken: token,
          inviteTokenExp: expiry,
        },
      });
    } else if (user.isDeleted) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          inviteToken: token,
          inviteTokenExp: expiry,
        },
      });
    }

    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      update: {
        role: role as any,
        ...(customJson !== undefined ? { customPermissions: customJson } : {}),
        inviteToken: token,
        inviteTokenExp: expiry,
      },
      create: {
        tenantId,
        userId: user.id,
        role: role as any,
        customPermissions: customJson,
        inviteToken: token,
        inviteTokenExp: expiry,
      },
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://premier-farm.wandera.online").replace(/\/$/, "");
    const setupLink = `${appUrl}/accept-invite?token=${token}`;

    const mailRes = await sendEmail({
      to: email,
      subject: `${APP_BRAND_NAME} — Account Provisioning`,
      template: "invite",
      data: {
        link: setupLink,
      },
    });

    revalidatePath("/users");

    if (!mailRes.success) {
      return {
        success: true,
        message: "Invitation created (SMTP email failed — copy the setup link below).",
        backupInvite: `Invite Link: ${setupLink}\nEmail: ${email}`,
      };
    }

    return {
      success: true,
      message: "Invitation email sent successfully!",
      backupInvite: `Invite Link: ${setupLink}\nEmail: ${email}`,
    };
  } catch (err: any) {
    console.error("[INVITE ERROR]", err);
    return { success: false, message: err?.message || "Internal server error." };
  }
}

async function countOtherActiveAdmins(tenantId: string, excludeUserId: string): Promise<number> {
  return prisma.tenantUser.count({
    where: {
      tenantId,
      userId: { not: excludeUserId },
      role: "ADMIN",
      inviteToken: null,
      user: { isDeleted: false },
    },
  });
}

export async function updateUserAccess(
  targetUserId: string,
  payload: {
    role: "ADMIN" | "MANAGER" | "WORKER";
    permissionMap?: Partial<Record<PermissionKey, boolean>>;
    resetToDefaults?: boolean;
  }
) {
  try {
    const { tenantId, userId: currentUserId } = await requirePermission("users:manage");

    if (!["ADMIN", "MANAGER", "WORKER"].includes(payload.role)) {
      return { success: false, message: "Invalid role selected." };
    }

    const existingMembership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: targetUserId,
        },
      },
    });

    if (!existingMembership) {
      return { success: false, message: "Member not found in this organization." };
    }

    // Prevent self-demotion from ADMIN
    if (currentUserId === targetUserId && existingMembership.role === "ADMIN" && payload.role !== "ADMIN") {
      return {
        success: false,
        message: "You cannot demote your own Administrator role. Ask another Admin if needed.",
      };
    }

    // Compute cleaned overrides
    let overridesDiff: Partial<Record<PermissionKey, boolean>> = {};
    if (!payload.resetToDefaults && payload.permissionMap) {
      const sanitizedDesired: Partial<Record<PermissionKey, boolean>> = {};
      for (const k of ALL_PERMISSION_KEYS) {
        if (typeof payload.permissionMap[k] === "boolean") {
          sanitizedDesired[k] = payload.permissionMap[k];
        }
      }
      overridesDiff = computePermissionOverridesDiff(payload.role, sanitizedDesired);
    }

    const resultingEffective = resolvePermissionMap(payload.role, overridesDiff);

    // Prevent revoking own `users:manage`
    if (currentUserId === targetUserId && !resultingEffective["users:manage"]) {
      return {
        success: false,
        message: "You cannot revoke your own Team & Permissions management access.",
      };
    }

    // Last Admin guard: ensure at least 1 active ADMIN with `users:manage` remains in the org
    if (
      existingMembership.role === "ADMIN" &&
      (payload.role !== "ADMIN" || !resultingEffective["users:manage"])
    ) {
      const otherAdmins = await countOtherActiveAdmins(tenantId, targetUserId);
      if (otherAdmins === 0) {
        return {
          success: false,
          message: "Cannot remove Administrator access from the only active Admin in this organization.",
        };
      }
    }

    await prisma.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId: targetUserId,
        },
      },
      data: {
        role: payload.role,
        customPermissions: Object.keys(overridesDiff).length > 0 ? overridesDiff : null as any,
      },
    });

    revalidatePath("/users");
    revalidatePath("/");
    return {
      success: true,
      message: payload.resetToDefaults
        ? "Member reset to default role permissions."
        : "Member role and permissions updated successfully!",
    };
  } catch (e: any) {
    console.error("updateUserAccess error:", e);
    return { success: false, message: e?.message || "Failed to update permissions." };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  if (newRole !== "ADMIN" && newRole !== "MANAGER" && newRole !== "WORKER") {
    return { success: false, message: "Invalid role." };
  }
  return updateUserAccess(userId, { role: newRole, resetToDefaults: false });
}

export async function removeUser(userId: string) {
  try {
    const { tenantId, userId: currentUserId } = await requirePermission("users:manage");

    if (currentUserId === userId) {
      return { success: false, message: "You cannot remove your own account from this farm." };
    }

    const membership = await prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (membership?.role === "ADMIN") {
      const otherAdmins = await countOtherActiveAdmins(tenantId, userId);
      if (otherAdmins === 0) {
        return {
          success: false,
          message: "Cannot remove the last active Administrator from this organization.",
        };
      }
    }

    await prisma.tenantUser.delete({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });

    revalidatePath("/users");
    return { success: true, message: "User removed from this farm successfully." };
  } catch (e: any) {
    return { success: false, message: e?.message || "Failed to remove user." };
  }
}

export async function validateInviteToken(token: string) {
  try {
    const membership = await prisma.tenantUser.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExp: { gte: new Date() },
      },
      include: {
        user: true,
        tenant: true,
      },
    });

    if (membership && membership.user && !membership.user.isDeleted) {
      return {
        success: true,
        data: {
          email: membership.user.email,
          role: membership.role,
          farmName: membership.tenant.name || APP_BRAND_NAME,
        },
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExp: { gte: new Date() },
        isDeleted: false,
      },
      select: {
        email: true,
        role: true,
      },
    });

    if (!user) return { success: false, message: "Invalid or expired invitation token." };
    return { success: true, data: { ...user, farmName: APP_BRAND_NAME } };
  } catch {
    return { success: false, message: "Verification failed." };
  }
}

const phoneRegex = /^(\+?[1-9]\d{7,14}|0[17]\d{8})$/;

const setupInvitedSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phoneNumber: z
    .string()
    .trim()
    .refine(
      (val) => phoneRegex.test(val.replace(/[\s-]/g, "")),
      "Please enter a valid phone number (e.g. +254 700 000 000 or 0700000000)"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function completeInvitedSetup(token: string, data: any) {
  try {
    const val = setupInvitedSchema.safeParse(data);
    if (!val.success) return { success: false, message: val.error.issues[0].message };

    const membership = await prisma.tenantUser.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExp: { gte: new Date() },
      },
      include: { user: true },
    });

    let targetUser = membership?.user;

    if (!targetUser) {
      targetUser =
        (await prisma.user.findFirst({
          where: {
            inviteToken: token,
            inviteTokenExp: { gte: new Date() },
            isDeleted: false,
          },
        })) || undefined;
    }

    if (!targetUser) return { success: false, message: "Invite token invalid or expired." };

    const hashedPassword = await bcrypt.hash(val.data.password, 10);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        firstName: val.data.firstName,
        lastName: val.data.lastName,
        phoneNumber: val.data.phoneNumber,
        password: hashedPassword,
        inviteToken: null,
        inviteTokenExp: null,
      },
    });

    if (membership) {
      await prisma.tenantUser.update({
        where: { id: membership.id },
        data: {
          inviteToken: null,
          inviteTokenExp: null,
        },
      });
    }

    return { success: true, message: "Account setup complete! You can now log in." };
  } catch {
    return { success: false, message: "Setup failed." };
  }
}

export async function resendInvitation(userId: string) {
  try {
    const { tenantId } = await requirePermission("users:manage");

    const membership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      include: { user: true },
    });

    if (!membership || !membership.user || membership.user.isDeleted) {
      return { success: false, message: "User not found on this farm." };
    }

    const inviteToken = membership.inviteToken || membership.user.inviteToken;
    if (!inviteToken) {
      return { success: false, message: "This user has already accepted the invitation." };
    }

    return await inviteUser({
      email: membership.user.email,
      role: membership.role,
    });
  } catch (e: any) {
    return { success: false, message: e?.message || "Failed to resend invitation." };
  }
}

export async function getInviteLinkByUserId(userId: string) {
  try {
    const { tenantId } = await requirePermission("users:manage");

    const membership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      include: { user: true },
    });

    if (!membership || !membership.user) {
      return { success: false, message: "User membership not found." };
    }

    const token = membership.inviteToken || membership.user.inviteToken;
    if (!token) {
      return { success: false, message: "No active invitation found." };
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://premier-farm.wandera.online").replace(/\/$/, "");
    const setupLink = `${appUrl}/accept-invite?token=${token}`;
    return { success: true, link: setupLink };
  } catch (e: any) {
    return { success: false, message: e?.message || "Failed to fetch invite link." };
  }
}
