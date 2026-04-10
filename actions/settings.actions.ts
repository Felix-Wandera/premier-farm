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
      const firstError = val.error.errors[0]?.message || "Invalid input.";
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
import nodemailer from "nodemailer";
import crypto from "crypto";

export async function requestPasswordReset(email: string) {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Please enter a valid email address." };
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Security: always return success to avoid email enumeration
    if (!user || user.isDeleted) {
      return { success: true, message: "If that email is registered, a reset link has been sent." };
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

    // Send email if SMTP is configured
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"Premier Farm" <${process.env.SMTP_USER || "admin@premierfarm.co.ke"}>`,
        to: email,
        subject: "Password Reset — Premier Farm",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1e293b; padding: 24px; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Premier Farm</h1>
            </div>
            <div style="padding: 24px;">
              <h2>Password Reset</h2>
              <p>You requested a password reset. Click the button below to set a new password. This link expires in 1 hour.</p>
              <p style="margin-top: 24px;">
                <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
              </p>
              <p style="color: #64748b; font-size: 12px; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      });
    } else {
      console.log(`[PASSWORD RESET] Token for ${email}: ${rawToken}`);
      console.log(`[PASSWORD RESET] Link: ${resetLink}`);
    }

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
