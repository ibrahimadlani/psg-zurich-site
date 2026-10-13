"use client";

import { useState } from "react";

/**
 * Message under a form field. It unfolds (height + fade, 200 ms) instead of popping in, and
 * folds away the same way: the last message stays in place while it closes. While hidden it
 * also cancels the parent's flex gap (-8px), so the field doesn't keep an empty line.
 */
export function FieldError({ id, children }: { id: string; children?: string | null }) {
  const [last, setLast] = useState(children);
  // Remember the latest message (React's "adjust state while rendering" pattern).
  if (children && children !== last) setLast(children);
  const shown = Boolean(children);

  return (
    <div
      data-shown={shown || undefined}
      className="-mt-2 grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,margin] duration-200 ease-out data-[shown]:mt-0 data-[shown]:grid-rows-[1fr] data-[shown]:opacity-100 motion-reduce:transition-none"
    >
      <span id={id} aria-hidden={!shown} className="min-h-0 overflow-hidden text-[13px] text-destructive">
        {children ?? last}
      </span>
    </div>
  );
}
