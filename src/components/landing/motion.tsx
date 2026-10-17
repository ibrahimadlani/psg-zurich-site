"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Calls `onEnter` once, the first time the element comes into view. */
function useEnter<T extends HTMLElement>(onEnter: () => void, rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const callback = useRef(onEnter);
  useEffect(() => {
    callback.current = onEnter;
  });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        callback.current();
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);
  return ref;
}

/**
 * Sets --p on its box, from 0 (top of the page) to 1 (box scrolled away), for the layers of
 * the hero illustration. Nothing moves when reduced motion is asked for.
 */
export function Parallax({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)));
      element.style.setProperty("--p", progress.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Its `.reveal` children fade up, one after the other (--i), when the block comes into view.
 * Hidden only once the script runs (data-armed), so the content never depends on it.
 */
export function Reveal({ children, className, as: Tag = "div", id }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "ul"; id?: string }) {
  const [state, setState] = useState<"idle" | "armed" | "shown">("idle");
  const ref = useEnter<HTMLDivElement>(() => setState("shown"));
  useEffect(() => {
    if (reducedMotion()) return;
    // Arm only what is still below the fold: what is already on screen stays as it is.
    const box = ref.current?.getBoundingClientRect();
    if (box && box.top > window.innerHeight * 0.9) setState((value) => (value === "idle" ? "armed" : value));
  }, [ref]);
  return (
    <Tag ref={ref as React.Ref<never>} id={id} data-armed={state === "armed" || undefined} data-shown={state === "shown" || undefined} className={className}>
      {children}
    </Tag>
  );
}

/** A figure that counts up to its value the first time it is seen. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const ref = useEnter<HTMLSpanElement>(() => {
    if (reducedMotion() || value < 2) return;
    const start = performance.now();
    const duration = Math.min(1800, 700 + value * 4);
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) requestAnimationFrame(step);
    };
    setShown(0);
    requestAnimationFrame(step);
  });
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {shown}
      <span className="sr-only">{value}</span>
    </span>
  );
}

/** Leans its child towards the pointer, with a light that follows; only with a real mouse. */
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element || event.pointerType !== "mouse" || reducedMotion()) return;
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    element.style.setProperty("--rx", `${((0.5 - y) * 14).toFixed(2)}deg`);
    element.style.setProperty("--ry", `${((x - 0.5) * 18).toFixed(2)}deg`);
    element.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    element.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    element.dataset.tilting = "";
  }
  function leave() {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
    delete element.dataset.tilting;
  }
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn("landing-tilt", className)}>
      {children}
    </div>
  );
}
