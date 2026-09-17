import { NextRequest, NextResponse } from "next/server";
import { getSession, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId } = await req.json();
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Verify user actually belongs to this tenant
    const membership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: session.id as string,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!membership || membership.tenant.status !== "ACTIVE") {
      return NextResponse.json({ error: "You do not have access to this farm organization." }, { status: 403 });
    }

    // Re-sign token with new active tenant context
    const token = await signToken({
      id: session.id as string,
      email: session.email as string,
      role: session.role as string,
      tenantId: membership.tenantId,
      tenantSlug: membership.tenant.slug,
      tenantRole: membership.role,
    });

    const response = NextResponse.json({
      success: true,
      message: `Switched to ${membership.tenant.name}`,
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        role: membership.role,
      },
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("switch-tenant error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
