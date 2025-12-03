import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  } else if (sessionCookie && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/write", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except:
    // - / (root)
    // - /api
    // - /_next/static
    // - /_next/image
    // - /contact
    // - /brand-assets
    // - /terms
    // - /privacy
    // - /images
    "/((?!api|signin|_next/static|_next/image|contact|terms|brand-assets|privacy|images|$).*)",
  ],
};
