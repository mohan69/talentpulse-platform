import { PageTitle } from "@/components/workspace/page-title";
import { Radar, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RecruiterSourcingIntelligence() {
  return (
    <>
      <PageTitle
        title="Sourcing Intelligence"
        description="AI-powered multi-source candidate discovery and talent intelligence."
      />
      <div className="rounded-xl bg-card shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
          <Radar className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Coming Soon — Phase 2</h2>
        <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
          Sourcing Intelligence will unify multi-source candidate discovery, natural language intent parsing,
          and AI-powered enrichment into one seamless workflow.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
          {[
            { label: "Multi-Source Search", desc: "GitHub, Google CSE, internal DB, and more from one query" },
            { label: "Intent Parsing", desc: "Natural language queries automatically extract skills, location, seniority" },
            { label: "AI Enrichment", desc: "Auto-score candidates for fit, stability, and response likelihood" },
          ].map((f) => (
            <div key={f.label} className="rounded-lg bg-muted/50 p-4 text-left">
              <Sparkles className="h-4 w-4 text-primary mb-2" />
              <div className="font-medium text-sm mb-1">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
