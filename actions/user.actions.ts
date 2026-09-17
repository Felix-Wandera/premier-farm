"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireTenantContext, requireTenantRole } from "./utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/mail";
import crypto from "crypto";

export async function getUsers() {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);

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

  return memberships.map(m => {
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
        const diffHours = Math.round((inviteTokenExp.getTime() - now.getTime()) / (1000 * 60 * 60));
        if (diffHours < 24) {
          expiryRemainingText = `Expires in ${Math.max(1, diffHours)}h`;
        } else {
          const diffDays = Math.round(diffHours / 24);
          expiryRemainingText = `Expires in ${diffDays}d`;
        }
      }
    }

    return {
      id: u.id,
      name: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email.split("@")[0].replace(".", " "),
      email: u.email,
      role: m.role,
      lastActive: u.createdAt.toLocaleDateString(),
      isPending,
      isExpired,
      expiryText: expiryRemainingText
    };
  });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "WORKER"])
});

export async function inviteUser(data: any) {
  try {
    const { tenantId } = await requireTenantRole(["ADMIN"]);

    const val = inviteSchema.safeParse(data);
    if (!val.success) return { success: false, message: "Invalid email or role." };

    const { email, role } = val.data;
    console.log(`[INVITE TRACE] Inviting ${email} (Role: ${role}) to tenant ${tenantId}`);

    // Check if user already exists globally
    let user = await prisma.user.findUnique({ where: { email } });

    // Generate secure token
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
    }

    // Upsert membership for this tenant
    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      update: {
        role: role as any,
        inviteToken: token,
        inviteTokenExp: expiry,
      },
      create: {
        tenantId,
        userId: user.id,
        role: role as any,
        inviteToken: token,
        inviteTokenExp: expiry,
      },
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://premier-farm.wandera.online').replace(/\/$/, '');
    const setupLink = `${appUrl}/accept-invite?token=${token}`;

    // Send email via central utility with templates
    console.log(`[INVITE TRACE] Dispatching email to central utility...`);
    const mailRes = await sendEmail({
        to: email,
        subject: "Premier Farm — Account Provisioning",
        template: 'invite',
        data: { 
            link: setupLink 
        }
    });

    if (!mailRes.success) {
        console.error(`[INVITE TRACE] Email delivery FAILED: ${mailRes.message}`);
        return { success: false, message: mailRes.message || "Email delivery failed." };
    }

    console.log(`[INVITE TRACE] Email delivery SUCCESS. MessageID: ${mailRes.messageId}`);
    const emailStatus = "Email sent successfully.";

    revalidatePath("/users");
    
    return { 
      success: true, 
      message: emailStatus, 
      backupInvite: `Invite Link: ${setupLink}\nEmail: ${email}`
    };

  } catch (err: any) {
    console.error("[INVITE ERROR]", err);
    return { success: false, message: err?.message || "Internal server error." };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    const { tenantId, userId: currentUserId } = await requireTenantRole(["ADMIN"]);

    if (!["ADMIN", "MANAGER", "WORKER"].includes(newRole)) {
      return { success: false, message: "Invalid role." };
    }

    // Prevent self-demotion
    if (currentUserId === userId && newRole !== "ADMIN") {
      return { success: false, message: "You cannot change your own role. Ask another admin." };
    }

    await prisma.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      data: { role: newRole as any },
    });

    revalidatePath("/users");
    return { success: true, message: "Role updated successfully." };
  } catch (e) {
    return { success: false, message: "Failed to update role." };
  }
}

export async function removeUser(userId: string) {
  try {
    const { tenantId, userId: currentUserId } = await requireTenantRole(["ADMIN"]);

    if (currentUserId === userId) {
      return { success: false, message: "You cannot remove your own account from this farm." };
    }

    // Remove tenant membership for this farm
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
  } catch (e) {
    return { success: false, message: "Failed to remove user." };
  }
}

// Invitation Flow Specifics
export async function validateInviteToken(token: string) {
  try {
    // Check TenantUser first
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
          farmName: membership.tenant.name,
        },
      };
    }

    // Fallback: check global user invite token
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
    return { success: true, data: user };
  } catch (e) {
    return { success: false, message: "Verification failed." };
  }
}

const setupInvitedSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(10, "Valid phone number required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export async function completeInvitedSetup(token: string, data: any) {
    try {
        const val = setupInvitedSchema.safeParse(data);
        if (!val.success) return { success: false, message: val.error.issues[0].message };

        // Check if token belongs to TenantUser or User
        const membership = await prisma.tenantUser.findFirst({
            where: {
                inviteToken: token,
                inviteTokenExp: { gte: new Date() }
            },
            include: { user: true }
        });

        let targetUser = membership?.user;

        if (!targetUser) {
            targetUser = await prisma.user.findFirst({
                where: {
                    inviteToken: token,
                    inviteTokenExp: { gte: new Date() },
                    isDeleted: false
                }
            }) || undefined;
        }

        if (!targetUser) return { success: false, message: "Invite token invalid or expired." };

        const hashedPassword = await bcrypt.hash(data.password, 10);

        await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                password: hashedPassword,
                inviteToken: null,
                inviteTokenExp: null
            }
        });

        if (membership) {
            await prisma.tenantUser.update({
                where: { id: membership.id },
                data: {
                    inviteToken: null,
                    inviteTokenExp: null
                }
            });
        }

        return { success: true, message: "Account setup complete! You can now log in." };
    } catch (e) {
        return { success: false, message: "Setup failed." };
    }
}

export async function resendInvitation(userId: string) {
    try {
        const { tenantId } = await requireTenantRole(["ADMIN"]);

        const membership = await prisma.tenantUser.findUnique({
            where: {
                tenantId_userId: {
                    tenantId,
                    userId,
                }
            },
            include: { user: true }
        });

        if (!membership || !membership.user || membership.user.isDeleted) {
            return { success: false, message: "User not found on this farm." };
        }

        const inviteToken = membership.inviteToken || membership.user.inviteToken;
        if (!inviteToken) {
            return { success: false, message: "This user has already accepted the invitation." };
        }

        console.log(`[INVITE TRACE] Resending invitation to user: ${membership.user.email} (ID: ${userId}) on tenant ${tenantId}`);
        
        // Re-use inviteUser to re-generate token and send email
        return await inviteUser({ email: membership.user.email, role: membership.role });
    } catch (e: any) {
        return { success: false, message: e?.message || "Failed to resend invitation." };
    }
}

export async function getInviteLinkByUserId(userId: string) {
    try {
        const { tenantId } = await requireTenantRole(["ADMIN"]);

        const membership = await prisma.tenantUser.findUnique({
            where: {
                tenantId_userId: {
                    tenantId,
                    userId,
                }
            },
            include: { user: true }
        });

        if (!membership || !membership.user) {
            return { success: false, message: "User membership not found." };
        }

        const token = membership.inviteToken || membership.user.inviteToken;
        if (!token) {
            return { success: false, message: "No active invitation found." };
        }

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://premier-farm.wandera.online').replace(/\/$/, '');
        const setupLink = `${appUrl}/accept-invite?token=${token}`;
        return { success: true, link: setupLink };
    } catch (e: any) {
        return { success: false, message: e?.message || "Failed to fetch invite link." };
    }
}


