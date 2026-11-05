import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui";
import { getArcanaBlueprint } from "@/lib/systems";
import { blueprintInputsHash, getFirstName, toBlueprintLocale } from "@/lib/ai/blueprint-synthesis";
import {
  BlueprintBadges,
  BlueprintConstellation,
  SynthesisText,
  getBlueprintBadges,
  type BlueprintBadge,
} from "@/components/blueprint";
import { linkButtonClass } from "@/components/blueprint/link-styles";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

/**
 * Loads a shared map. Only what the public page shows leaves this function:
 * the first name, the five badges' inputs and the synthesis if it still
 * matches the profile (never the full name or the birth date).
 */
const loadSharedBlueprint = cache(async (shareId: string) => {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(shareId)) return null;

  const arcana = await prisma.arcanaProfile.findUnique({
    where: { shareId },
    select: {
      synthesis: true,
      inputsHash: true,
      user: { select: { profile: { select: { birthDate: true, fullName: true, locale: true } } } },
    },
  });
  const profile = arcana?.user.profile;
  if (!arcana || !profile) return null;

  const synthesisLocale = toBlueprintLocale(profile.locale);
  const hash = blueprintInputsHash(profile.birthDate, profile.fullName, synthesisLocale);

  return {
    blueprint: getArcanaBlueprint(profile.birthDate, profile.fullName),
    firstName: getFirstName(profile.fullName),
    synthesis: arcana.inputsHash === hash && arcana.synthesis.trim() ? arcana.synthesis : null,
    synthesisLocale,
  };
});

async function badgesFor(data: NonNullable<Awaited<ReturnType<typeof loadSharedBlueprint>>>) {
  const t = await getTranslations("blueprint");
  const locale = toBlueprintLocale(await getLocale());
  return getBlueprintBadges(data.blueprint, locale, (key, values) => t(key, values));
}

const badgeLine = (badges: BlueprintBadge[]) =>
  badges.map((b) => (b.symbolIsText ? b.label : `${b.symbol} ${b.label}`)).join(" · ");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const t = await getTranslations("blueprint.public");
  const data = await loadSharedBlueprint(shareId);
  if (!data) {
    return { title: t("metaTitleNoName"), robots: { index: false } };
  }

  const title = data.firstName ? t("metaTitle", { name: data.firstName }) : t("metaTitleNoName");
  const description = `${badgeLine(await badgesFor(data))}. ${t("metaDescription")}`;
  const images = [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Arcana" }];

  return {
    title,
    description,
    robots: { index: false },
    openGraph: { type: "website", siteName: "Arcana", title, description, images },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
  };
}

export default async function SharedBlueprintPage({ params }: PageProps) {
  const { shareId } = await params;
  const data = await loadSharedBlueprint(shareId);
  if (!data) {
    notFound();
  }

  const t = await getTranslations("blueprint.public");
  const tBlueprint = await getTranslations("blueprint");
  const locale = toBlueprintLocale(await getLocale());
  const badges = await badgesFor(data);
  const initial = Array.from(data.firstName)[0]?.toLocaleUpperCase(locale) ?? "✦";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5">
        <Link
          href="/"
          className="rounded text-lg font-semibold text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span aria-hidden="true" className="text-amber-400">
            ✦{" "}
          </span>
          Arcana
        </Link>
        <Link href="/login" className={linkButtonClass("ghost", "sm")}>
          {t("login")}
        </Link>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl space-y-8 px-4 pb-16">
        <section
          aria-labelledby="shared-blueprint-title"
          className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-purple-950/70 via-slate-950 to-amber-950/30 px-5 py-8 text-center sm:px-10 sm:py-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl"
          />
          <div className="relative flex flex-col items-center">
            <BlueprintConstellation badges={badges} center={initial} />
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.25em] text-amber-400">{t("eyebrow")}</p>
            <h1 id="shared-blueprint-title" className="mt-2 text-3xl font-bold text-slate-100 text-balance sm:text-4xl">
              {data.firstName ? t("title", { name: data.firstName }) : t("titleNoName")}
            </h1>
            <BlueprintBadges
              badges={badges}
              label={tBlueprint("badgesLabel")}
              className="mt-5 justify-center"
            />
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300">{t("intro")}</p>
          </div>
        </section>

        <Card variant="highlighted" role="region" aria-labelledby="shared-synthesis-title">
          <CardContent className="p-5 pt-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-amber-400">
                ✦
              </span>
              <h2 id="shared-synthesis-title" className="text-2xl font-semibold text-slate-100">
                {t("synthesisTitle")}
              </h2>
            </div>
            <div className="mt-6">
              {data.synthesis ? (
                <SynthesisText
                  text={data.synthesis}
                  lang={data.synthesisLocale}
                  questionsTitle={tBlueprint("synthesis.questionsTitle")}
                />
              ) : (
                <p className="text-slate-400">{t("noSynthesis")}</p>
              )}
            </div>
            <p className="mt-6 text-xs text-slate-500">{tBlueprint("synthesis.disclaimer")}</p>
          </CardContent>
        </Card>

        <section
          aria-labelledby="shared-blueprint-cta"
          className="rounded-2xl border border-slate-800 bg-gradient-to-r from-purple-900/30 to-amber-900/20 p-6 text-center sm:p-8"
        >
          <h2 id="shared-blueprint-cta" className="text-xl font-semibold text-slate-100">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-slate-400">{t("ctaText")}</p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className={linkButtonClass("primary", "lg", "w-full sm:w-auto")}>
              {t("cta")}
            </Link>
            <Link href="/login" className={linkButtonClass("ghost", "md")}>
              {t("login")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
