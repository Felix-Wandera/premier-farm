import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

// Add any routes that should not be protected here
const publicRoutes = ["/login", "/login/forgot", "/accept-invite"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and internal Next.js routes are automatically handled

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/login")
  );

  const token = request.cookies.get("auth_token")?.value;

  // Skip auth check for public routes (unless logged in and trying to access login)
  if (isPublicRoute) {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        // Logged in users shouldn't access login page, redirect to home
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Handle protected routes
  if (!token) {
    // No token found, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token exists, verify it
  const payload = await verifyToken(token);

  if (!payload) {
    // Invalid or expired token, redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Optionally clear the invalid cookie
    response.cookies.delete("auth_token");
    return response;
  }

  // User is authenticated, proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp)).*)',
  ],
};
