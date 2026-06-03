import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token as any;
    const role = token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    // Route role guards
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/recruiter") && !(role === "RECRUITER" || role === "ADMIN")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/client-portal") && role !== "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/candidate-portal") && role !== "CANDIDATE") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/recruiter/:path*",
    "/client-portal/:path*",
    "/candidate-portal/:path*",
    "/api/jobs/:path*",
    "/api/candidates/:path*",
    "/api/applications/:path*",
    "/api/interviews/:path*",
    "/api/offers/:path*",
    "/api/analytics/:path*",
    "/api/clients/:path*",
    "/api/ai/:path*",
    "/api/upload/:path*",
    "/api/email/:path*",
  ],
};
