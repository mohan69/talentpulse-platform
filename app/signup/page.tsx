import { SignupForm } from "./signup-form";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-md">
        <Link href="/" className="flex mb-8 justify-center w-full">
          <BrandLogo size={44} priority />
        </Link>
        <div className="rounded-xl bg-card p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Join TalentPulse to track your applications and interviews.</p>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
