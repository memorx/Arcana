import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui";
import { getArcanaBlueprint } from "@/lib/systems";
import { blueprintInputsHash, toBlueprintLocale } from "@/lib/ai/blueprint-synthesis";
import { BlueprintBadges, getBlueprintBadges } from "@/components/blueprint";
import { linkButtonClass } from "@/components/blueprint/link-styles";

interface BlueprintWidgetProps {
  userId: string;
}

/**
 * Dashboard card for the Arcana Map. Without a profile: a call to complete
 * it. With one: the five badges, whether the synthesis is ready, and a link
 * to /blueprint.
 */
export async function BlueprintWidget({ userId }: BlueprintWidgetProps) {
  const t = await getTranslations("blueprint");
  const locale = toBlueprintLocale(await getLocale());

  const [profile, arcana] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true, fullName: true, locale: true },
    }),
    prisma.arcanaProfile.findUnique({
      where: { userId },
      select: { inputsHash: true },
    }),
  ]);

  if (!profile) {
    return (
      <Card className="h-full border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-slate-900/50">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-2xl text-amber-300">
              ✦
            </span>
            <div>
              <h3 className="font-semibold text-slate-100">{t("widget.setupTitle")}</h3>
              <p className="mt-1 text-sm text-slate-400">{t("widget.setupText")}</p>
            </div>
          </div>
          <Link href="/profile/setup" className={linkButtonClass("primary", "sm", "mt-auto self-start")}>
            {t("widget.setupCta")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const bp = getArcanaBlueprint(profile.birthDate, profile.fullName);
  const badges = getBlueprintBadges(bp, locale, (key, values) => t(key, values));
  const hasSynthesis =
    arcana?.inputsHash ===
    blueprintInputsHash(profile.birthDate, profile.fullName, toBlueprintLocale(profile.locale));

  return (
    <Card className="h-full border-purple-500/20 bg-gradient-to-br from-purple-900/20 via-slate-900/50 to-amber-900/10">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-slate-100">
            <span aria-hidden="true" className="text-amber-400">
              ✦
            </span>
            {t("widget.title")}
          </h3>
          <Link href="/blueprint" className={linkButtonClass("secondary", "sm", "shrink-0")}>
            {t("widget.cta")}
          </Link>
        </div>
        <BlueprintBadges badges={badges} label={t("badgesLabel")} size="sm" />
        <p className="mt-auto text-xs text-slate-400">
          {hasSynthesis ? t("widget.synthesisReady") : t("widget.synthesisPending")}
        </p>
      </CardContent>
    </Card>
  );
}
