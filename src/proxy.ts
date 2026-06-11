import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic redirect only — real session validation happens in the
// account page's server component via auth.api.getSession.
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (!sessionCookie && pathname.startsWith("/account")) {
    const login = new URL("/login", request.url);
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    if (redirectTo) login.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(login);
  }
  if (sessionCookie && (pathname === "/login" || pathname === "/signup")) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    const dest = redirectTo ?? "/account";
    return NextResponse.redirect(new URL(dest, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/login", "/signup"],
};
