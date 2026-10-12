/** Short labels used on phones: long competition and club names don't fit next to crests. */
const SHORT_NAMES: Record<string, string> = {
  "UEFA Champions League": "UCL",
  "Paris Saint-Germain": "PSG",
};

/** Full name from the sm breakpoint, short one below (screen readers always get the full name). */
export function ShortName({ name }: { name: string }) {
  const short = SHORT_NAMES[name];
  if (!short) return name;
  return (
    <>
      <span aria-hidden className="sm:hidden">
        {short}
      </span>
      <span className="max-sm:sr-only">{name}</span>
    </>
  );
}
