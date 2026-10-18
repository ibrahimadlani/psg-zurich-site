import { Suspense } from "react";
import { cn } from "@/lib/utils";

/*
 * Checking the loading placeholders: in development, SKELETON_DELAY_MS=3000 in .env holds every
 * streamed part back that long, so each page's skeleton stays on screen. Never in production.
 */
const DELAY_MS = process.env.NODE_ENV === "production" ? 0 : Number(process.env.SKELETON_DELAY_MS) || 0;

async function Held({ children }: { children: React.ReactNode }) {
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  return children;
}

/**
 * A Suspense boundary whose content, once streamed, fades in where the placeholder was
 * (animate-content-in, globals.css). `className`: classes of the content's wrapper (e.g. when
 * it is a grid item).
 */
export function Streamed({ fallback, children, className }: { fallback: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Suspense fallback={fallback}>
      <div className={cn("animate-content-in", className)}>{DELAY_MS ? <Held>{children}</Held> : children}</div>
    </Suspense>
  );
}
