"use client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PipelineStage } from "@prisma/client";
import { initials } from "@/lib/format";
import Link from "next/link";

type AppCard = { id: string; candidateId: string; stage: PipelineStage; matchScore: number | null; candidate: { name: string; currentCity: string | null }; job: { title: string } };

export function PipelineBoard({ applications, detailPathPrefix = "/admin/candidates" }: { applications: AppCard[]; detailPathPrefix?: string }) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function moveStage(appId: string, newStage: PipelineStage) {
    try {
      const res = await fetch(`/api/applications/${appId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) });
      if (res.ok) router.refresh();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGE_ORDER.map((stage) => {
        const cards = applications.filter((a) => a.stage === stage);
        return (
          <div key={stage} className="min-w-[260px] w-[260px] shrink-0 rounded-xl bg-muted/40 p-3"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => { if (draggedId) { moveStage(draggedId, stage); setDraggedId(null); } }}>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="text-xs font-semibold">{STAGE_LABELS[stage]}</div>
              <div className="text-xs text-muted-foreground">{cards.length}</div>
            </div>
            <div className="space-y-2">
              {cards.map((c) => (
                <div key={c.id} draggable onDragStart={() => setDraggedId(c.id)} className="p-3 rounded-lg bg-card shadow-sm cursor-grab hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">{initials(c.candidate.name)}</div>
                    <Link href={`${detailPathPrefix}/${c.candidateId}`} className="text-sm font-medium hover:text-primary truncate">{c.candidate.name}</Link>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.job.title}</div>
                  <div className="flex items-center justify-between mt-2"><span className="text-xs text-muted-foreground">{c.candidate.currentCity ?? ""}</span>{c.matchScore !== null && <span className="text-xs font-semibold text-primary">{c.matchScore}%</span>}</div>
                </div>
              ))}
              {cards.length === 0 && <div className="text-xs text-muted-foreground/70 text-center py-4">Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
