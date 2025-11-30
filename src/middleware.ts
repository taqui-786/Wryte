import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const pathname = request.nextUrl.pathname;

  if (session) {
    if (pathname === "/" || pathname === "/signin") {
      return NextResponse.redirect(new URL("/write", request.url));
    }
  } 

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/", "/signin", "/write"], 
};
