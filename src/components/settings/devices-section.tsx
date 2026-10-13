"use client";

import { Laptop, Smartphone } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/lib/auth-client";

type Device = { token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date; updatedAt: Date };

/** "Safari · iPhone", "Chrome · Windows"… from the user agent. */
function describe(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : null;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  return { label: [browser, os].filter(Boolean).join(" · "), mobile: /iPhone|Android|Mobile/.test(ua) };
}

// Only the start of the address: enough to recognise a network, not to locate someone.
const maskIp = (ip: string | null | undefined) => (ip ? ip.replace(/^(\d+\.\d+)\.\d+\.\d+$/, "$1.x.x").replace(/^([\da-f]+:[\da-f]+):.*$/i, "$1:…") : null);

/** Signed-in devices, with sign-out per device or for all the others. */
export function DevicesSection() {
  const t = useTranslations("Settings.account");
  const format = useFormatter();
  // Refreshed every minute: "active 3 minutes ago" stays right.
  const now = useNow({ updateInterval: 60_000 });
  const { data } = useSession();
  const currentToken = data?.session.token;
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchDevices = useCallback(
    () =>
      authClient.listSessions().then(({ data: list }) =>
        (list ?? [])
          .map((session) => ({ ...session, createdAt: new Date(session.createdAt), updatedAt: new Date(session.updatedAt) }))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      ),
    [],
  );
  const load = useCallback(async () => setDevices(await fetchDevices()), [fetchDevices]);

  useEffect(() => {
    // Fetched in the browser: Better Auth's client already knows the session.
    let active = true;
    fetchDevices().then((list) => {
      if (active) setDevices(list);
    });
    return () => {
      active = false;
    };
  }, [fetchDevices]);

  const revoke = (token: string) =>
    startTransition(async () => {
      const { error } = await authClient.revokeSession({ token });
      if (error) toast.error(t("deviceError"));
      else toast.success(t("deviceRevoked"));
      await load();
    });
  const revokeOthers = () =>
    startTransition(async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error) toast.error(t("deviceError"));
      else toast.success(t("devicesRevoked"));
      await load();
    });

  if (!devices) return <p className="text-sm text-muted-foreground">{t("devicesLoading")}</p>;
  const others = devices.filter((device) => device.token !== currentToken);

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {devices.map((device) => {
          const { label, mobile } = describe(device.userAgent);
          const Icon = mobile ? Smartphone : Laptop;
          const current = device.token === currentToken;
          return (
            <li key={device.token} className="flex items-center gap-3 p-3">
              <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {label || t("unknownDevice")}
                  {current ? <span className="ml-2 text-xs font-normal text-ok">{t("thisDevice")}</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[maskIp(device.ipAddress), t("lastActive", { date: format.relativeTime(device.updatedAt, now) })]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {current ? null : (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => revoke(device.token)}>
                  {t("signOutDevice")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others.length > 0 ? (
        <Button variant="outline" disabled={pending} onClick={revokeOthers}>
          {t("signOutOthers")}
        </Button>
      ) : null}
    </div>
  );
}
