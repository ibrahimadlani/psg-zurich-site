import { cn } from "@/lib/utils";

// Shared styles of the sign-in screens (Claude Design "Login").
export const labelClass =
  "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";

export const inputClass =
  "h-[38px] w-full rounded-[8px] border bg-card px-[14px] text-[14px] text-foreground outline-none [transition:border-color_.2s,box-shadow_.2s] placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_oklch(0.62_0.13_248/0.2)] aria-invalid:border-destructive";

export const submitClass =
  "mt-2 h-[38px] cursor-pointer rounded-[8px] bg-segment font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98] disabled:cursor-default disabled:opacity-60";

export function AuthPanel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-[22px]">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-narrow text-[length:clamp(32px,6vw,44px)] leading-[0.95] font-extrabold uppercase italic">
          {title}
        </h1>
        <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <span id={id} className="text-[13px] text-destructive">
      {children}
    </span>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[8px] border px-[14px] py-2.5 text-[14px]",
        tone === "error" ? "border-destructive/40 text-destructive" : "bg-card text-foreground",
      )}
    >
      {children}
    </p>
  );
}

/** Underlined text link: "Adhérer", "Retour à la connexion"… */
export const inlineLinkClass =
  "border-b pb-0.5 text-foreground transition-colors hover:border-brand-red";
