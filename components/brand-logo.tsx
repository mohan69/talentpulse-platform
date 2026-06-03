import Image from "next/image";
import { cn } from "@/lib/utils";

// Official TalentPulse brand asset shipped under /public/brand/ :
//  - talentpulse-wordmark.png : 1200 x 400 (aspect 3:1) — wordmark + logo mark
//  - talentpulse-logo.png     : 1200 x 400 (aspect 3:1) — full logo lockup
// The official logo is a horizontal lockup; we expose both variants for API
// compatibility but render the same crisp asset for now.
// TODO: Replace with actual TalentPulse brand assets when available.
const WORDMARK_W = 1200;
const WORDMARK_H = 400;
const WORDMARK_ASPECT = WORDMARK_W / WORDMARK_H; // 3:1

const FULL_W = 1200;
const FULL_H = 400;
const FULL_ASPECT = FULL_W / FULL_H; // 3:1

interface BrandLogoProps {
  /**
   * Height in pixels. Width auto-scales based on the chosen variant's aspect ratio.
   * Recommended heights: navbar=32–40, hero/auth panels=56–80.
   */
  size?: number;
  /**
   * - "wordmark" (default): horizontal logo with wordmark + swoosh-on-O. Best for navbars/headers.
   * - "full": stacked logo with swoosh rising above the wordmark. Best for large hero placements.
   */
  variant?: "wordmark" | "full";
  className?: string;
  /** Inverts colors for use on dark/colored backgrounds (becomes white). */
  invert?: boolean;
  priority?: boolean;
}

/**
 * Official TalentPulse brand logo. Renders the logo at any height while preserving
 * native aspect ratio for crisp, non-stretched output.
 */
export function BrandLogo({
  size = 36,
  variant = "wordmark",
  className,
  invert = false,
  priority = false,
}: BrandLogoProps) {
  const isFull = variant === "full";
  const nativeW = isFull ? FULL_W : WORDMARK_W;
  const nativeH = isFull ? FULL_H : WORDMARK_H;
  const aspect = isFull ? FULL_ASPECT : WORDMARK_ASPECT;
  const src = isFull ? "/brand/talentpulse-logo.png" : "/brand/talentpulse-wordmark.png";

  const height = size;
  const width = Math.round(height * aspect);

  return (
    <div
      className={cn("relative inline-block shrink-0", className)}
      style={{ width, height }}
      aria-label="TalentPulse"
    >
      <Image
        src={src}
        alt="TalentPulse"
        width={nativeW}
        height={nativeH}
        className={cn(
          "h-full w-full object-contain",
          invert && "brightness-0 invert",
        )}
        priority={priority}
        quality={100}
      />
    </div>
  );
}
