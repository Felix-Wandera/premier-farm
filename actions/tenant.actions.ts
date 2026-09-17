"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

const registerFarmSchema = z.object({
  farmName: z.string().min(2, "Farm name must be at least 2 characters"),
  location: z.string().optional(),
  currencySymbol: z.string().default("KES"),
  // Optional user fields for unauthenticated registration
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Valid email required").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  phoneNumber: z.string().optional(),
});

export async function registerFarm(data: any) {
  try {
    const val = registerFarmSchema.safeParse(data);
    if (!val.success) {
      return { success: false, message: val.error.issues[0].message };
    }

    const { farmName, location, currencySymbol, firstName, lastName, email, password, phoneNumber } = val.data;

    const session = await getSession();
    let userId = session?.id as string | undefined;
    let userEmail = session?.email as string | undefined;
    let globalRole = (session?.role as string) || "ADMIN";

    // If not authenticated, validate and create new user
    if (!userId) {
      if (!email || !password) {
        return { success: false, message: "Email and password are required for new account registration." };
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return { success: false, message: "An account with this email already exists. Please log in first." };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: firstName || "",
          lastName: lastName || "",
          phoneNumber: phoneNumber || null,
          role: "ADMIN",
        },
      });

      userId = newUser.id;
      userEmail = newUser.email;
      globalRole = newUser.role;
    }

    // Generate unique slug
    let baseSlug = slugify(farmName);
    if (!baseSlug) baseSlug = "farm";
    let candidateSlug = baseSlug;
    let counter = 1;

    while (await prisma.tenant.findUnique({ where: { slug: candidateSlug } })) {
      candidateSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create Tenant and Owner Membership
    const tenant = await prisma.tenant.create({
      data: {
        name: farmName,
        slug: candidateSlug,
        location: location || null,
        currencySymbol: currencySymbol || "KES",
        status: "ACTIVE",
        memberships: {
          create: {
            userId: userId!,
            role: "ADMIN",
          },
        },
      },
    });

    // Sign new session token with this tenant context
    const token = await signToken({
      id: userId!,
      email: userEmail!,
      role: globalRole,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantRole: "ADMIN",
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    revalidatePath("/");

    return {
      success: true,
      message: `Farm "${tenant.name}" created successfully!`,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  } catch (error: any) {
    console.error("registerFarm error:", error);
    return { success: false, message: error?.message || "Failed to register farm organization." };
  }
}
