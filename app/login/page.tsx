import { LoginForm } from "./login-form";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,white_0%,transparent_60%)] opacity-10" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/30 blur-3xl" />
        <Link href="/" className="relative inline-flex">
          <div className="inline-flex items-center rounded-2xl bg-white px-6 py-3 shadow-lg">
            <BrandLogo size={44} priority />
          </div>
        </Link>
        <div className="relative">
          <h1 className="font-display text-4xl font-bold tracking-tight leading-tight">
            AI-native talent intelligence, purpose-built for your agency.
          </h1>
          <p className="mt-4 opacity-80 leading-relaxed">
            Source smarter, screen with AI, accelerate pipeline velocity, and close hires faster — all from a single workspace.
          </p>
        </div>
        <div className="text-sm opacity-60 relative">
          © {new Date().getFullYear()} TalentPulse · AI-Native Talent Intelligence Platform
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo size={44} priority />
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
