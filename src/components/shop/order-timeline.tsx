import { Check } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

type Order = {
  status: string;
  fulfilment: "pickup" | "shipping";
  paidAt: Date | null;
  readyAt: Date | null;
  shippedAt: Date | null;
  handedOverAt: Date | null;
};

/** Paid → ready (or shipped) → handed over: done steps filled, the current one in red, dates under them. */
export async function OrderTimeline({ order }: { order: Order }) {
  const [t, format] = await Promise.all([getTranslations("Orders"), getFormatter()]);
  const shipping = order.fulfilment === "shipping";
  const steps = shipping
    ? [
        { key: "paid" as const, at: order.paidAt, done: true },
        { key: "shipped" as const, at: order.shippedAt, done: order.status === "shipped" || order.status === "handed_over" },
      ]
    : [
        { key: "paid" as const, at: order.paidAt, done: true },
        { key: "ready" as const, at: order.readyAt, done: order.status === "ready" || order.status === "handed_over" },
        { key: "handedOver" as const, at: order.handedOverAt, done: order.status === "handed_over" },
      ];
  const current = steps.findIndex((step) => !step.done);
  if (order.status === "canceled") return <p className="text-[13px] text-muted-foreground">{t("canceled")}</p>;
  return (
    <ol className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex flex-col items-center gap-1.5 text-center">
          {/* The line to the next step. */}
          {index < steps.length - 1 ? (
            <span aria-hidden className={cn("absolute top-3 left-1/2 h-0.5 w-full", steps[index + 1]!.done ? "bg-ok" : "bg-foreground/10")} />
          ) : null}
          <span
            className={cn(
              "relative grid size-6 place-items-center rounded-full ring-4 ring-card",
              step.done ? "bg-ok text-white" : index === current ? "bg-psg-red text-white" : "bg-foreground/10 text-muted-foreground",
            )}
          >
            {step.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <span className="size-1.5 rounded-full bg-current" />}
          </span>
          <span className={cn("text-[12px] leading-tight font-semibold", !step.done && index !== current && "text-muted-foreground")}>{t(`steps.${step.key}`)}</span>
          <span className="text-[11px] text-muted-foreground">{step.at ? format.dateTime(step.at, { day: "numeric", month: "short" }) : index === current ? t("inProgress") : ""}</span>
        </li>
      ))}
    </ol>
  );
}
