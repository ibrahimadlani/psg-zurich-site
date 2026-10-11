"use client";

import { RefreshCw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Health = {
  status: "ok" | "degraded";
  version: string;
  db: "ok" | "error";
  time: string;
};

type State = { phase: "loading" } | { phase: "done"; health: Health | null };

async function fetchHealth(): Promise<Health | null> {
  try {
    // 503 still carries a JSON body describing what is wrong.
    const response = await fetch("/api/health", { cache: "no-store" });
    return (await response.json()) as Health;
  } catch {
    return null;
  }
}

function StatusBadge({ good, children }: { good: boolean; children: React.ReactNode }) {
  return (
    <Badge
      variant={good ? "default" : "destructive"}
      className={cn(good && "bg-emerald-600 text-white dark:bg-emerald-500")}
    >
      {children}
    </Badge>
  );
}

export function DeploymentStatus() {
  const t = useTranslations("DeploymentStatus");
  const format = useFormatter();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let active = true;
    fetchHealth().then((health) => active && setState({ phase: "done", health }));
    return () => {
      active = false;
    };
  }, []);

  function refresh() {
    setState({ phase: "loading" });
    fetchHealth().then((health) => setState({ phase: "done", health }));
  }

  const health = state.phase === "done" ? state.health : null;

  return (
    <Card aria-live="polite" aria-busy={state.phase === "loading"}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t.rich("description", { code: (chunks) => <code>{chunks}</code> })}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={refresh} disabled={state.phase === "loading"}>
            <RefreshCw className={cn(state.phase === "loading" && "animate-spin")} aria-hidden />
            {t("refresh")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {state.phase === "loading" ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : !health ? (
          <p className="text-sm text-destructive">{t("unreachable")}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">{t("status")}</dt>
            <dd>
              <StatusBadge good={health.status === "ok"}>
                {health.status === "ok" ? t("ok") : t("degraded")}
              </StatusBadge>
            </dd>
            <dt className="text-muted-foreground">{t("version")}</dt>
            <dd className="font-mono">{health.version}</dd>
            <dt className="text-muted-foreground">{t("database")}</dt>
            <dd>
              <StatusBadge good={health.db === "ok"}>
                {health.db === "ok" ? t("dbOk") : t("dbError")}
              </StatusBadge>
            </dd>
            <dt className="text-muted-foreground">{t("serverTime")}</dt>
            <dd className="tabular-nums">
              {format.dateTime(new Date(health.time), { dateStyle: "medium", timeStyle: "medium" })}
            </dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
