"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/mail";
import crypto from "crypto";

export async function getUsers() {
  await requireAuth();

  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      inviteToken: true
    }
  });

  return users.map(u => ({
    id: u.id,
    name: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email.split("@")[0].replace(".", " "),
    email: u.email,
    role: u.role,
    lastActive: u.createdAt.toLocaleDateString(),
    isPending: !!u.inviteToken
  }));
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "WORKER"])
});

export async function inviteUser(data: any) {
  try {
    await requireAuth();

    const val = inviteSchema.safeParse(data);
    if (!val.success) return { success: false, message: "Invalid email or role." };

    const { email, role } = val.data;
    console.log(`[INVITE TRACE] Starting invitation process for: ${email} (Role: ${role})`);
    
    const existing = await prisma.user.findUnique({ where: { email } });

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    console.log(`[INVITE TRACE] Token generated. Expiry: ${expiry.toISOString()}`);

    if (existing) {
      if (existing.isDeleted || existing.inviteToken) {
        // Restore deactivated user OR update pending user (for resend)
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            isDeleted: false,
            deletedAt: null,
            role: role as any,
            inviteToken: token,
            inviteTokenExp: expiry,
            // Reset profile fields if they were never finished
            firstName: existing.firstName || null,
            lastName: existing.lastName || null,
          }
        });
      } else {
        return { success: false, message: "A user with this email already exists." };
      }
    } else {
      await prisma.user.create({
        data: {
          email,
          role: role as any,
          password: await bcrypt.hash(crypto.randomUUID(), 10),
          inviteToken: token,
          inviteTokenExp: expiry
        }
      });
    }

    const setupLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

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

  } catch (err) {
    return { success: false, message: "Internal server error." };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    const session = await requireAuth();

    if (!["ADMIN", "MANAGER", "WORKER"].includes(newRole)) {
      return { success: false, message: "Invalid role." };
    }

    // Prevent self-demotion
    if ((session.id as string) === userId && newRole !== "ADMIN") {
      return { success: false, message: "You cannot change your own role. Ask another admin." };
    }

    await prisma.user.update({
      where: { id: userId },
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
    const session = await requireAuth();

    if ((session.id as string) === userId) {
      return { success: false, message: "You cannot remove your own account." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true },
    });

    revalidatePath("/users");
    return { success: true, message: "User removed successfully." };
  } catch (e) {
    return { success: false, message: "Failed to remove user." };
  }
}

// Invitation Flow Specifics
export async function validateInviteToken(token: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExp: { gte: new Date() },
        isDeleted: false
      },
      select: {
          email: true,
          role: true
      }
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

        const user = await prisma.user.findFirst({
            where: {
                inviteToken: token,
                inviteTokenExp: { gte: new Date() },
                isDeleted: false
            }
        });

        if (!user) return { success: false, message: "Invite token invalid or expired." };

        const hashedPassword = await bcrypt.hash(data.password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                password: hashedPassword,
                inviteToken: null,
                inviteTokenExp: null
            }
        });

        return { success: true, message: "Account setup complete! You can now log in." };
    } catch (e) {
        return { success: false, message: "Setup failed." };
    }
}

export async function resendInvitation(userId: string) {
    try {
        await requireAuth();

        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false }
        });

        if (!user) return { success: false, message: "User not found." };
        if (!user.inviteToken) return { success: false, message: "This user has already joined." };

        console.log(`[INVITE TRACE] Resending invitation to user: ${user.email} (ID: ${userId})`);
        
        // Reuse the inviteUser logic but for existing user
        return await inviteUser({ email: user.email, role: user.role });
    } catch (e) {
        return { success: false, message: "Failed to resend invitation." };
    }
}

export async function getInviteLinkByUserId(userId: string) {
    try {
        await requireAuth();

        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            select: { inviteToken: true }
        });

        if (!user || !user.inviteToken) return { success: false, message: "No active invitation found." };

        const setupLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite?token=${user.inviteToken}`;
        return { success: true, link: setupLink };
    } catch (e) {
        return { success: false, message: "Failed to fetch invite link." };
    }
}


