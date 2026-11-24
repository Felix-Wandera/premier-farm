"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, requireTenantContext } from "./utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/mail";
import crypto from "crypto";
import {
  APP_BRAND_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_FARM_EMAIL,
  DEFAULT_FARM_LOCATION,
  DEFAULT_FARM_PHONE,
} from "@/lib/branding";

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
  } catch {
    return { success: false, message: "An unexpected error occurred." };
  }
}

// ============================================
// Forgot Password — Request Reset Token
// ============================================
export async function requestPasswordReset(email: string) {
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return { success: true, message: "If that email is registered, a reset link has been sent." };
    }

    if (user.isDeleted) {
      return { success: false, message: "Your account is currently deactivated. You cannot reset your password." };
    }

    const rawToken = crypto.randomUUID();
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExp: expiry },
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://premier-farm.wandera.online").replace(/\/$/, "");
    const resetLink = `${appUrl}/login/reset?token=${rawToken}`;

    await sendEmail({
      to: normalizedEmail,
      subject: `Password Reset — ${APP_BRAND_NAME}`,
      template: "reset",
      data: {
        link: resetLink,
      },
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
  } catch {
    return { success: false, message: "An unexpected error occurred." };
  }
}

// ============================================
// Profile Management
// ============================================
const phoneRegex = /^(\+?[1-9]\d{7,14}|0[17]\d{8})$/;

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Invalid email address."),
  phoneNumber: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/[\s-]/g, "")),
      "Please enter a valid phone number (e.g. +254 700 000 000 or 0700000000)."
    ),
});

export async function updateUserProfile(data: any) {
  try {
    const sessionUser = await requireAuth();
    const userId = sessionUser.id as string;

    const val = updateProfileSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid input." };
    }

    const { firstName, lastName, email, phoneNumber } = val.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: userId },
        isDeleted: false,
      },
    });

    if (existing) {
      return { success: false, message: "This email is already in use by another account." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        phoneNumber: phoneNumber || null,
      },
    });

    return { success: true, message: "Profile updated successfully!" };
  } catch (e) {
    console.error("Profile update error:", e);
    return { success: false, message: "Failed to update profile." };
  }
}

// ============================================
// Farm Profile Configuration (Unified onto Active Tenant)
// ============================================
export async function getFarmSettings() {
  try {
    const { tenantId } = await requireTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant) {
      return {
        success: true,
        data: {
          id: tenant.id,
          farmName: tenant.name || APP_BRAND_NAME,
          location: tenant.location || DEFAULT_FARM_LOCATION,
          phoneNumber: tenant.phoneNumber || DEFAULT_FARM_PHONE,
          email: tenant.email || DEFAULT_FARM_EMAIL,
          currencySymbol: tenant.currencySymbol || DEFAULT_CURRENCY,
        },
      };
    }

    return {
      success: true,
      data: {
        id: "default",
        farmName: APP_BRAND_NAME,
        location: DEFAULT_FARM_LOCATION,
        phoneNumber: DEFAULT_FARM_PHONE,
        email: DEFAULT_FARM_EMAIL,
        currencySymbol: DEFAULT_CURRENCY,
      },
    };
  } catch (e) {
    console.error("getFarmSettings error:", e);
    return {
      success: false,
      data: {
        id: "default",
        farmName: APP_BRAND_NAME,
        location: DEFAULT_FARM_LOCATION,
        phoneNumber: DEFAULT_FARM_PHONE,
        email: DEFAULT_FARM_EMAIL,
        currencySymbol: DEFAULT_CURRENCY,
      },
    };
  }
}

const farmSettingSchema = z.object({
  farmName: z.string().trim().min(2, "Farm name must be at least 2 characters."),
  location: z.string().trim().min(2, "Location is required."),
  phoneNumber: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Invalid email address.").optional().or(z.literal("")),
  currencySymbol: z.string().trim().min(1, "Currency symbol is required."),
});

export async function updateFarmSettings(data: any) {
  try {
    const { tenantId } = await requirePermission("settings:manage");

    const val = farmSettingSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0]?.message || "Invalid input." };
    }

    const { farmName, location, phoneNumber, email, currencySymbol } = val.data;

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: farmName,
        location,
        phoneNumber: phoneNumber || null,
        email: email || null,
        currencySymbol,
      },
    });

    // Keep FarmSetting synced for legacy compatibility
    await prisma.farmSetting.upsert({
      where: { id: "default" },
      update: {
        farmName,
        location,
        phoneNumber: phoneNumber || null,
        email: email || null,
        currencySymbol,
      },
      create: {
        id: "default",
        farmName,
        location,
        phoneNumber: phoneNumber || null,
        email: email || null,
        currencySymbol,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath("/herd");
    revalidatePath("/sales");
    revalidatePath("/analytics");

    return {
      success: true,
      message: "Farm profile updated successfully!",
      data: {
        id: updatedTenant.id,
        farmName: updatedTenant.name,
        location: updatedTenant.location || "",
        phoneNumber: updatedTenant.phoneNumber || "",
        email: updatedTenant.email || "",
        currencySymbol: updatedTenant.currencySymbol,
      },
    };
  } catch (e: any) {
    console.error("updateFarmSettings error:", e);
    return { success: false, message: e.message || "Failed to update farm settings." };
  }
}

export async function updateFarmName(newName: string) {
  try {
    const { tenantId } = await requirePermission("settings:manage");

    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      return { success: false, message: "Farm name must be at least 2 characters." };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { name: trimmed },
    });

    await prisma.farmSetting.upsert({
      where: { id: "default" },
      update: { farmName: trimmed },
      create: { id: "default", farmName: trimmed },
    });

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true, message: `Ranch name updated to "${trimmed}"!` };
  } catch (e: any) {
    console.error("updateFarmName error:", e);
    return { success: false, message: e.message || "Failed to update ranch name." };
  }
}
