import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const hasAdminRole = (role: string | string[] | null | undefined): boolean => {
  const normalized = Array.isArray(role) ? role.join(",") : (role ?? "");
  return normalized.split(",").some((item) => item.trim() === "admin");
};

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === "/" || pathname === "/signin";
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    // Full session validation for admin paths.
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    if (!hasAdminRole(session.user.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // If user has a session and tries to access public routes, redirect to /dashboard
  if (sessionCookie && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user doesn't have a session and tries to access protected routes, redirect to /
  if (!sessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except:
    // - /api
    // - /_next/static
    // - /_next/image
    // - /contact
    // - /brand-assets
    // - /terms
    // - /privacy
    // - /images
    "/((?!api|_next/static|_next/image|contact|terms|brand-assets|privacy|images).*)",
  ],
};
