import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 1. Admin route protection: strictly restricted to role === 'admin'
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 2. Startup-only route protection: /forecast
    if (pathname.startsWith("/forecast")) {
      if (token?.role !== "startup" && token?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 3. Supplier-only route protection: /listings/new
    if (pathname.startsWith("/listings/new")) {
      if (token?.role !== "supplier" && token?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/listings/:path*",
    "/contracts/:path*",
    "/forecast/:path*",
    "/wallet/:path*",
    "/leaderboard/:path*",
    "/reliability/:path*",
    "/admin/:path*",
  ],
};
