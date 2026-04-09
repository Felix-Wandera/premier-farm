import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// Only enable in development mode
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const adminEmail = process.env.TECH_ADMIN_EMAIL || "admin@premierfarm.com";
    const adminPasswordRaw = process.env.TECH_ADMIN_PASSWORD || "admin123";

    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    if (existingAdmin) {
      // If we want to ensure the tech user credentials match the .env,
      // we can optionally update it. Let's just return success for now if one exists,
      // or we can update the existing admin's credentials to ensure they always work!
      const hashedPassword = await hashPassword(adminPasswordRaw);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          email: adminEmail,
          password: hashedPassword,
        }
      });

      return NextResponse.json({ 
        message: "Admin user updated with system credentials.",
        credentials: { email: adminEmail } 
      }, { status: 200 });
    }

    const hashedPassword = await hashPassword(adminPasswordRaw);

    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "System Tech Admin",
        password: hashedPassword,
        role: "ADMIN"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Tech Admin user created successfully",
      credentials: {
        email: user.email,
        password: "***" // Hide password in response
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
