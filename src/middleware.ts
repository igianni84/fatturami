import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/registrati", "/auth/callback", "/api/stripe"];
const AUTH_ONLY_PATHS = ["/onboarding"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  const { supabase, response } = await createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Landing page: public, but redirect authenticated users to dashboard
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    // If already authenticated, redirect away from login/register
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // Protected routes: redirect to login if no session
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Auth-only paths (e.g. onboarding): authenticated but no company gate
  if (AUTH_ONLY_PATHS.some((path) => pathname.startsWith(path))) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
