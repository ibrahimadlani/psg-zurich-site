"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mounts its children only once they come near the screen (a map, an embed): nothing is loaded
 * for visitors who never scroll that far. The placeholder holds the space meanwhile.
 */
export function LazyVisible({ children, placeholder }: { children: React.ReactNode; placeholder: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
    }, { rootMargin: "300px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  return <div ref={ref}>{visible ? children : placeholder}</div>;
}
