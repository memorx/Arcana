import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getArcanaBlueprint } from "@/lib/systems";
import { blueprintInputsHash, toBlueprintLocale } from "@/lib/ai/blueprint-synthesis";
import { BlueprintBadges } from "@/components/blueprint/BlueprintBadges";
import { getBlueprintBadges } from "@/components/blueprint/view-model";
import { ENLACE_DATO, ROTULO, TITULO_CELDA } from "./estilos";

interface BlueprintWidgetProps {
  userId: string;
}

/**
 * Dashboard cell for the Arcana Map. Without a profile: a call to complete
 * it. With one: the five badges, whether the synthesis is ready, and a link
 * to /blueprint.
 */
export async function BlueprintWidget({ userId }: BlueprintWidgetProps) {
  const t = await getTranslations("blueprint");
  const locale = toBlueprintLocale(await getLocale());

  let profile: { birthDate: Date; fullName: string; locale: string } | null;
  let arcana: { inputsHash: string } | null;
  try {
    [profile, arcana] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: { birthDate: true, fullName: true, locale: true },
      }),
      prisma.arcanaProfile.findUnique({
        where: { userId },
        select: { inputsHash: true },
      }),
    ]);
  } catch (error) {
    // A widget must never take the dashboard down.
    console.error("BlueprintWidget error:", error);
    return null;
  }

  if (!profile) {
    return (
      <div className="flex h-full flex-col gap-3">
        <h2 className={TITULO_CELDA}>{t("widget.setupTitle")}</h2>
        <p className="font-lectura text-[0.9375rem] leading-snug text-letra-suave">{t("widget.setupText")}</p>
        <Link href="/profile/setup" className={buttonClasses({ variant: "primario", size: "sm", className: "mt-auto self-start" })}>
          {t("widget.setupCta")}
        </Link>
      </div>
    );
  }

  let bp: ReturnType<typeof getArcanaBlueprint>;
  try {
    bp = getArcanaBlueprint(profile.birthDate, profile.fullName);
  } catch (error) {
    console.error("BlueprintWidget blueprint error:", error);
    return null;
  }
  const badges = getBlueprintBadges(bp, locale, (key, values) => t(key, values));
  const hasSynthesis =
    arcana?.inputsHash ===
    blueprintInputsHash(profile.birthDate, profile.fullName, toBlueprintLocale(profile.locale));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={TITULO_CELDA}>{t("widget.title")}</h2>
        <Link href="/blueprint" className={ENLACE_DATO}>
          {t("widget.cta")} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <BlueprintBadges badges={badges} label={t("badgesLabel")} size="sm" />
      <p className={`${ROTULO} mt-auto`}>
        {hasSynthesis ? t("widget.synthesisReady") : t("widget.synthesisPending")}
      </p>
    </div>
  );
}
