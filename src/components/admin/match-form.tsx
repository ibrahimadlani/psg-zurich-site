"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MATCH_STATUSES, MATCH_VENUES } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";

const goals = z.string().regex(/^\d{0,2}$/);
const schema = z
  .object({
    competition: z.string().trim().min(1).max(120),
    round: z.string().trim().max(80),
    opponent: z.string().trim().min(1).max(120),
    opponentLogo: z.union([z.url().max(255), z.literal("")]),
    kickoffAt: z.string().min(1),
    venue: z.enum(MATCH_VENUES),
    stadium: z.string().trim().max(160),
    city: z.string().trim().max(120),
    status: z.enum(MATCH_STATUSES),
    psgScore: goals,
    opponentScore: goals,
    regulationPsgScore: goals,
    regulationOpponentScore: goals,
    penaltyPsgScore: goals,
    penaltyOpponentScore: goals,
  })
  .refine((v) => v.status !== "finished" || (v.psgScore !== "" && v.opponentScore !== ""), { path: ["psgScore"] });
export type MatchFormValues = z.infer<typeof schema>;

export const emptyMatch: MatchFormValues = {
  competition: "",
  round: "",
  opponent: "",
  opponentLogo: "",
  kickoffAt: "",
  venue: "home",
  stadium: "",
  city: "",
  status: "scheduled",
  psgScore: "",
  opponentScore: "",
  regulationPsgScore: "",
  regulationOpponentScore: "",
  penaltyPsgScore: "",
  penaltyOpponentScore: "",
};

// Competitions football-data.org's free plan doesn't cover.
const SUGGESTED_COMPETITIONS = ["Coupe de France", "Trophée des Champions", "Match amical", "Coupe du monde des clubs"];

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const toNumber = (value: string) => (value === "" ? undefined : Number(value));

/** Create (no `matchId`) or edit a match entered by hand. Kick-off is read in the admin's time zone. */
export function MatchForm({ matchId, defaults = emptyMatch, onDone }: { matchId?: string; defaults?: MatchFormValues; onDone?: () => void }) {
  const t = useTranslations("AdminMatches");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MatchFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const status = useWatch({ control, name: "status" });
  const played = status === "live" || status === "finished";
  const prefix = `match-${matchId ?? "new"}`;

  async function onSubmit(values: MatchFormValues) {
    const optional = (value: string) => value || undefined;
    const response = await fetch(matchId ? `/api/v1/matches/${matchId}` : "/api/v1/matches", {
      method: matchId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        competition: values.competition,
        round: optional(values.round),
        opponent: values.opponent,
        opponentLogo: optional(values.opponentLogo),
        kickoffAt: new Date(values.kickoffAt).toISOString(),
        venue: values.venue,
        stadium: optional(values.stadium),
        city: optional(values.city),
        status: values.status,
        psgScore: toNumber(values.psgScore),
        opponentScore: toNumber(values.opponentScore),
        regulationPsgScore: toNumber(values.regulationPsgScore),
        regulationOpponentScore: toNumber(values.regulationOpponentScore),
        penaltyPsgScore: toNumber(values.penaltyPsgScore),
        penaltyOpponentScore: toNumber(values.penaltyOpponentScore),
      }),
    });
    if (!response.ok) {
      toast.error(t("error"));
      return;
    }
    toast.success(t(matchId ? "updated" : "created"));
    if (!matchId) reset(emptyMatch);
    onDone?.();
    router.refresh();
  }

  const field = (name: keyof MatchFormValues, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${prefix}-${name}`}>{label}</Label>
      <Input id={`${prefix}-${name}`} aria-invalid={errors[name] ? true : undefined} {...props} {...register(name)} />
    </div>
  );
  const scoreField = (name: keyof MatchFormValues, label: string) =>
    field(name, label, { inputMode: "numeric", maxLength: 2, className: "w-20 text-center tabular-nums" });

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error(t("invalid")))} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("competition", t("competition"), { list: `${prefix}-competitions`, maxLength: 120, placeholder: "Coupe de France" })}
        <datalist id={`${prefix}-competitions`}>
          {SUGGESTED_COMPETITIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {field("round", t("round"), { maxLength: 80, placeholder: t("roundPlaceholder") })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("opponent", t("opponent"), { maxLength: 120, placeholder: "Olympique Lyonnais" })}
        {field("opponentLogo", t("opponentLogo"), { type: "url", placeholder: "https://" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        {field("kickoffAt", t("kickoffAt"), { type: "datetime-local" })}
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-venue`}>{t("venue")}</Label>
          <select id={`${prefix}-venue`} className={selectClass} {...register("venue")}>
            {MATCH_VENUES.map((venue) => (
              <option key={venue} value={venue}>
                {t(`venues.${venue}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("stadium", t("stadium"), { maxLength: 160, placeholder: "Parc des Princes" })}
        {field("city", t("city"), { maxLength: 120, placeholder: "Paris" })}
      </div>

      <div className="space-y-1.5 sm:max-w-xs">
        <Label htmlFor={`${prefix}-status`}>{t("status")}</Label>
        <select id={`${prefix}-status`} className={selectClass} {...register("status")}>
          {MATCH_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`statuses.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {played ? (
        <fieldset className="space-y-3 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">{t("score")}</legend>
          <div className="flex flex-wrap gap-4">
            {scoreField("psgScore", "PSG")}
            {scoreField("opponentScore", t("opponentShort"))}
          </div>
          {status === "finished" ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">{t("extraTime")}</summary>
              <p className="mt-2 text-xs text-muted-foreground">{t("extraTimeHint")}</p>
              <div className="mt-3 flex flex-wrap gap-4">
                {scoreField("regulationPsgScore", t("regulationPsg"))}
                {scoreField("regulationOpponentScore", t("regulationOpponent"))}
                {scoreField("penaltyPsgScore", t("penaltiesPsg"))}
                {scoreField("penaltyOpponentScore", t("penaltiesOpponent"))}
              </div>
            </details>
          ) : null}
        </fieldset>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : matchId ? t("save") : t("create")}
      </Button>
    </form>
  );
}

/** Edit / delete buttons of a manual match, with the form unfolding below. */
export function ManualMatchActions({ matchId, defaults }: { matchId: string; defaults: MatchFormValues }) {
  const t = useTranslations("AdminMatches");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing((value) => !value)}>
          {editing ? t("close") : t("edit")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={deleting}
          onClick={async () => {
            if (!confirm(t("confirmDelete"))) return;
            setDeleting(true);
            const response = await fetch(`/api/v1/matches/${matchId}`, { method: "DELETE" });
            setDeleting(false);
            if (response.ok) toast.success(t("deleted"));
            else toast.error(t("deleteError"));
            router.refresh();
          }}
        >
          {t("delete")}
        </Button>
      </div>
      {editing ? (
        <div className="rounded-lg border p-3">
          <MatchForm matchId={matchId} defaults={defaults} onDone={() => setEditing(false)} />
        </div>
      ) : null}
    </div>
  );
}
