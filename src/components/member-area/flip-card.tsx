"use client";

import { RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Credit-card sized card in 3D (85.6 × 53.98 mm): leans towards the pointer with a moving
 * sheen, and turns over on click / Enter / Space to show its back. The pointer only updates
 * CSS variables (no re-render); without motion, it just turns.
 */
export function FlipCard({
  front,
  back,
  label,
  hint,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  /** Accessible name of the card button ("Member card, turn over"). */
  label: string;
  /** Small line under the card ("Tap to see the QR code"). */
  hint: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  // While turning over, the pointer still tilts the card but must not shorten the turn.
  const turningUntil = useRef(0);

  const tilt = (event: React.PointerEvent) => {
    const element = card.current;
    if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty("--ry", `${(x - 0.5) * 16}deg`);
    element.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    element.style.setProperty("--px", `${x * 100}%`);
    element.style.setProperty("--py", `${y * 100}%`);
    if (event.timeStamp > turningUntil.current) element.dataset.tilting = "";
  };
  const rest = () => {
    const element = card.current;
    if (!element) return;
    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
    delete element.dataset.tilting;
  };
  const turn = () => {
    if (card.current) delete card.current.dataset.tilting;
    turningUntil.current = performance.now() + 700;
    setFlipped((value) => !value);
  };

  return (
    <div className="flex w-full max-w-[420px] flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={flipped}
        onClick={turn}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            turn();
          }
        }}
        onPointerMove={tilt}
        onPointerLeave={rest}
        className="@container aspect-[85.6/53.98] w-full cursor-pointer rounded-[18px] outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        <div
          ref={card}
          className={cn(
            "relative size-full [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(calc(var(--ry,0deg)+var(--flip)))]",
            "[transition:transform_0.7s_cubic-bezier(0.2,0.8,0.2,1)] data-[tilting]:[transition:transform_0.12s_ease-out] motion-reduce:[transition:none]",
            flipped ? "[--flip:180deg]" : "[--flip:0deg]",
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[18px] shadow-brand [backface-visibility:hidden]">
            {front}
            {/* Sheen that follows the pointer. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--px,30%)_var(--py,20%),rgb(255_255_255/0.22),transparent_45%)] mix-blend-soft-light"
            />
          </div>
          <div className="absolute inset-0 overflow-hidden rounded-[18px] shadow-brand [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {back}
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RotateCcw className="size-3" aria-hidden />
        {hint}
      </p>
    </div>
  );
}
