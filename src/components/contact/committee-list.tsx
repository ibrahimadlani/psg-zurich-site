import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user-avatar";

/** Who reads the messages: photo, first name and role of the committee (no personal address). */
export function CommitteeList({ people }: { people: { id: string; firstName: string; title: string | null; image: string | null; email: string }[] }) {
  const t = useTranslations("Contact");
  if (people.length === 0) return null;
  return (
    <section aria-labelledby="contact-committee" className="space-y-3">
      <div>
        <h2 id="contact-committee" className="font-wide text-[11px] font-semibold tracking-[0.08em] uppercase">
          {t("committeeTitle")}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("committeeIntro")}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-2.5 rounded-[12px] border bg-card p-2.5">
            <UserAvatar name={person.firstName} email={person.email} image={person.image} className="size-10 text-[11px]" />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">{person.firstName}</span>
              <span className="block truncate text-[12px] text-muted-foreground">{person.title}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
