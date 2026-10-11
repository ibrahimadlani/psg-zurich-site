import { getTranslations } from "next-intl/server";
import { DeploymentStatus } from "@/components/deployment-status";

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-xl bg-primary px-6 py-12 text-primary-foreground md:px-10">
        <p className="text-5xl font-black tracking-tight md:text-6xl">
          PSG <span className="text-brand-red">Zurich</span>
        </p>
        <h1 className="text-xl font-semibold md:text-2xl">{t("tagline")}</h1>
        <p className="max-w-2xl text-primary-foreground/80">{t("intro")}</p>
      </section>
      <DeploymentStatus />
    </div>
  );
}
