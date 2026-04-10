"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
import bcrypt from "bcryptjs";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string().min(1, "Please confirm your new password."),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export async function changePassword(data: any) {
  try {
    const sessionUser = await requireAuth();
    const userId = sessionUser.id as string;

    // Tech admin cannot change password via this flow
    if (userId === "tech-admin-global") {
      return { success: false, message: "Tech Admin password is managed via environment variables." };
    }

    const val = changePasswordSchema.safeParse(data);
    if (!val.success) {
      const firstError = val.error.issues[0]?.message || "Invalid input.";
      return { success: false, message: firstError };
    }

    const { currentPassword, newPassword } = val.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: "User not found." };

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return { success: false, message: "Current password is incorrect. Please try again." };
    }

    if (currentPassword === newPassword) {
      return { success: false, message: "New password must be different from your current password." };
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { success: true, message: "Password changed successfully! Please log in again with your new password." };
  } catch (e) {
    return { success: false, message: "An unexpected error occurred." };
  }
}

// ============================================
// Forgot Password — Request Reset Token
// ============================================
import { sendEmail } from "@/lib/mail";
import crypto from "crypto";

export async function requestPasswordReset(email: string) {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Please enter a valid email address." };
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { success: true, message: "If that email is registered, a reset link has been sent." };
    }

    if (user.isDeleted) {
        return { success: false, message: "Your account is currently deactivated. You cannot reset your password." };
    }

    // Generate token
    const rawToken = crypto.randomUUID();
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExp: expiry },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login/reset?token=${rawToken}`;

    // Send email via central utility with templates
    await sendEmail({
        to: email,
        subject: "Password Reset — Premier Farm",
        template: 'reset',
        data: { 
            link: resetLink 
        }
    });


    return { success: true, message: "If that email is registered, a reset link has been sent." };
  } catch (e) {
    console.error("Password reset error:", e);
    return { success: false, message: "An error occurred. Please try again." };
  }
}

// ============================================
// Reset Password via Token
// ============================================
export async function resetPasswordWithToken(token: string, newPassword: string) {
  try {
    if (!token || !newPassword) {
      return { success: false, message: "Invalid request." };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters." };
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExp: { gte: new Date() },
        isDeleted: false,
      },
    });

    if (!user) {
      return { success: false, message: "This reset link is invalid or has expired. Please request a new one." };
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return { success: true, message: "Password has been reset! You can now log in with your new password." };
  } catch (e) {
    return { success: false, message: "An unexpected error occurred." };
  }
}

// ============================================
// Profile Management
// ============================================
const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
  phoneNumber: z.string().optional().nullable(),
});

export async function updateUserProfile(data: any) {
  try {
    const sessionUser = await requireAuth();
    const userId = sessionUser.id as string;

    if (userId === "tech-admin-global") {
      return { success: false, message: "Tech Admin profile is immutable." };
    }

    const val = updateProfileSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid input." };
    }

    const { firstName, lastName, email, phoneNumber } = val.data;

    // Check if email is already taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        email,
        id: { not: userId },
        isDeleted: false,
      }
    });

    if (existing) {
      return { success: false, message: "This email is already in use by another account." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || null,
      }
    });

    return { success: true, message: "Profile updated successfully!" };
  } catch (e) {
    console.error("Profile update error:", e);
    return { success: false, message: "Failed to update profile." };
  }
}

