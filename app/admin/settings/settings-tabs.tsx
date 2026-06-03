"use client";

import { useState } from "react";
import { Building2, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyProfileClient } from "./company-profile-client";
import { IntegrationsClient } from "./integrations-client";

type Setting = { id: string; provider: string; config: Record<string, any>; isActive: boolean; lastTested: string | null };

const TABS = [
  { key: "company", label: "Company Profile", icon: Building2 },
  { key: "integrations", label: "Integrations", icon: Plug },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SettingsTabs({ initialSettings }: { initialSettings: Setting[] }) {
  const [tab, setTab] = useState<TabKey>("company");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "company" && <CompanyProfileClient />}
      {tab === "integrations" && <IntegrationsClient initialSettings={initialSettings} />}
    </div>
  );
}
