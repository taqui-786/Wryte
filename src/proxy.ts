import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;

  // If user has a session and tries to access public routes, redirect to /write
  if (sessionCookie && (pathname === "/" || pathname === "/signin")) {
    return NextResponse.redirect(new URL("/write", request.url));
  }

  // If user doesn't have a session and tries to access protected routes, redirect to /
  if (!sessionCookie && pathname !== "/" && pathname !== "/signin") {
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
