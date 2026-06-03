import { cn } from "@/lib/utils";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/types";
import type { PipelineStage } from "@prisma/client";

export function StageBadge({ stage, className }: { stage: PipelineStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        STAGE_COLORS[stage],
        className,
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
