"use client";

import { useSession } from "next-auth/react";
import { PageTitle } from "@/components/workspace/page-title";

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

export function RecruiterGreeting({ initialName }: { initialName?: string | null }) {
  const { data: session } = useSession();
  const displayName = session?.user?.name ?? initialName;

  return (
    <PageTitle
      title={`Hi ${firstName(displayName)} 👋`}
      description="Your active work and priorities."
    />
  );
}
