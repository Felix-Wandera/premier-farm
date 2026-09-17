import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  let fullUser = null;
  let memberships: any[] = [];

  if (session.id) {
    fullUser = await prisma.user.findUnique({
      where: { id: session.id as string },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      }
    });

    memberships = await prisma.tenantUser.findMany({
      where: { userId: session.id as string },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            location: true,
            currencySymbol: true,
            status: true,
          },
        },
      },
    });
  }

  if (!fullUser) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const activeTenantId = (session.tenantId as string) || memberships[0]?.tenantId;
  const activeMembership = memberships.find(m => m.tenantId === activeTenantId) || memberships[0];

  return NextResponse.json({
    authenticated: true,
    user: fullUser,
    activeTenant: activeMembership?.tenant || null,
    tenantRole: activeMembership?.role || fullUser.role,
    memberships: memberships.map(m => ({
      tenantId: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
      status: m.tenant.status,
    })),
  });
}
