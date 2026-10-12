import { cn } from "@/lib/utils";

function initials(name: string, email: string) {
  const parts = (name || email.split("@")[0] || "?").trim().split(/[\s._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + (last ?? "")).toUpperCase();
}

/** Profile picture, or the member's initials on a PSG-blue disc. */
export function UserAvatar({
  name,
  email,
  image,
  className,
}: {
  name: string;
  email: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-segment font-wide text-[10px] font-semibold tracking-[0.04em] text-segment-foreground",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- external avatar URL, images are unoptimized anyway
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initials(name, email)
      )}
    </span>
  );
}
