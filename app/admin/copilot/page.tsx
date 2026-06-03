import { PageTitle } from "@/components/workspace/page-title";
import { Bot, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminCopilot() {
  return (
    <>
      <PageTitle
        title="Copilot"
        description="AI-powered recruiter assistant with memory and context-aware intelligence."
      />
      <div className="rounded-xl bg-card shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
          <Bot className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Coming Soon — Phase 2</h2>
        <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
          TalentPulse Copilot will be your AI-native recruiting assistant with persistent memory,
          context-aware suggestions, and natural language interaction across your entire workflow.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
          {[
            { label: "Recruiter Memory", desc: "Learns your preferences, patterns, and feedback over time" },
            { label: "Context-Aware Chat", desc: "AI that understands your candidates, jobs, and pipeline" },
            { label: "Smart Suggestions", desc: "Proactive next-best-action recommendations" },
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
