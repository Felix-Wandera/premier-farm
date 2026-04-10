import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // Fetch full user details from DB to stay in sync with profile updates
  let fullUser = null;
  if (session.id && session.id !== "tech-admin-global") {
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
  } else if (session.id === "tech-admin-global") {
    // Tech admin doesn't exist in DB, return session payload
    fullUser = session;
  }

  return NextResponse.json({
    authenticated: true,
    user: fullUser,
  });
}
