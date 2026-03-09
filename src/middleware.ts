import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, errors } from "jose";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable must be set in production");
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production"
);

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and API routes for Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    const path = request.nextUrl.pathname;

    if (error instanceof errors.JWTExpired) {
      console.error(`[AUTH] JWT expired for path ${path}`);
    } else if (error instanceof errors.JWTClaimValidationFailed) {
      console.error(`[AUTH] JWT claim validation failed for path ${path}: ${error.message}`);
    } else if (error instanceof errors.JWTInvalid) {
      console.error(`[AUTH] JWT invalid for path ${path}: ${error.message}`);
    } else if (error instanceof errors.JWSSignatureVerificationFailed) {
      console.error(`[AUTH] JWT signature verification failed for path ${path}`);
    } else {
      console.error(`[AUTH] JWT verification error for path ${path}:`, error);
    }

    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }
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
