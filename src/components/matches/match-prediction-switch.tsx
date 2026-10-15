"use client";

import { ArrowLeft, Target } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { asideCard } from "@/components/matches/match-utils";
import { cn } from "@/lib/utils";

const Flip = createContext<((face: "match" | "prediction") => void) | null>(null);

const headerLink =
  "inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground";

/** In the match face's header, next to the calendar icon: turns the card into the prediction. */
export function PredictionToggle({ label }: { label: string }) {
  const flip = useContext(Flip);
  if (!flip) return null;
  return (
    <button type="button" onClick={() => flip("prediction")} className={headerLink}>
      <Target className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

/** First row of the prediction face, where the competition sits on the match face. */
export function BackToMatch({ label }: { label: string }) {
  const flip = useContext(Flip);
  if (!flip) return null;
  return (
    <button type="button" onClick={() => flip("match")} className={cn(headerLink, "self-start")}>
      <ArrowLeft className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

// One curve for everything, so frame and content move as one.
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * One card, two faces (the match, its prediction) that morph into each other: the frame stays,
 * its height glides to the new face while the old content dissolves out (fade, slight blur and
 * shrink) and the new one resolves in just after.
 */
export function MatchPredictionSwitch({ matchFace, predictionFace }: { matchFace: React.ReactNode; predictionFace: React.ReactNode }) {
  const [face, setFace] = useState<"match" | "prediction">("match");
  const matchRef = useRef<HTMLDivElement>(null);
  const predictionRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  // The frame takes the height of the face shown (and follows it if it changes).
  useEffect(() => {
    const element = face === "match" ? matchRef.current : predictionRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [face]);

  const faceClass = (active: boolean) =>
    cn(
      "[grid-area:1/1] self-start origin-top transition-[opacity,transform,filter] motion-reduce:transition-none",
      EASE,
      active
        ? "scale-100 opacity-100 blur-0 delay-100 duration-500"
        : "pointer-events-none scale-[0.97] opacity-0 blur-[3px] duration-250",
    );

  return (
    <Flip.Provider value={setFace}>
      <div className={cn(asideCard, "block p-5")}>
        <div
          className={cn("overflow-hidden transition-[height] duration-500 motion-reduce:transition-none", EASE)}
          style={{ height: height ?? undefined }}
        >
          <div className="grid">
            <div ref={matchRef} inert={face !== "match"} aria-hidden={face !== "match"} className={faceClass(face === "match")}>
              {matchFace}
            </div>
            <div ref={predictionRef} inert={face !== "prediction"} aria-hidden={face !== "prediction"} className={faceClass(face === "prediction")}>
              {predictionFace}
            </div>
          </div>
        </div>
      </div>
    </Flip.Provider>
  );
}
