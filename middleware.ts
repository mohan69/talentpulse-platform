import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token as any;
    const role = token?.role as string | undefined;
    const path = req.nextUrl.pathname;
    const mode = process.env.TENANT_ENFORCEMENT_MODE ?? "observe";
    const needsTenant = !path.startsWith("/api/auth") && !path.startsWith("/api/voice-screening/callback") && !path.startsWith("/api/voice-screening/twiml") && !path.startsWith("/api/voice-screening/webhook");

    if (needsTenant && !token?.organizationId && (mode === "observe" || mode === "warn")) {
      console.warn("[tenant-middleware] Missing organizationId on token", { path, userId: token?.id });
    }
    if (needsTenant && !token?.organizationId && mode === "enforce") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

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
    "/api/integrations/:path*",
    "/api/voice-screening/:path*",
    "/api/whatsapp/:path*",
    "/api/email-campaigns/:path*",
    "/api/email-templates/:path*",
    "/api/calendar/:path*",
    "/api/platform-subscriptions/:path*",
    "/api/job-postings/:path*",
    "/api/naukri-assistant/:path*",
    "/api/prospects/:path*",
    "/api/reports/:path*",
    "/api/saved-searches/:path*",
    "/api/company-profile/:path*",
    "/api/memory/:path*",
    "/api/conversations/:path*",
    "/api/screening/:path*",
    "/api/submission/:path*",
  ],
};
