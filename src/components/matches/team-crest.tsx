import { cn } from "@/lib/utils";

/** Club crest (remote logo from football-data.org, local PSG crest), with initials as fallback. */
export function TeamCrest({ name, logo, className }: { name: string; logo: string | null; className?: string }) {
  if (!logo) {
    return (
      <span
        aria-hidden
        className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-foreground/10 text-[10px] font-semibold", className)}
      >
        {name.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- remote crests, images are unoptimized anyway
  return <img src={logo} alt="" width={32} height={32} loading="lazy" className={cn("size-8 shrink-0 object-contain", className)} />;
}
