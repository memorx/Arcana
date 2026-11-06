import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getArcanaBlueprint } from "@/lib/systems";
import { blueprintInputsHash, getFirstName, toBlueprintLocale } from "@/lib/ai/blueprint-synthesis";
import { Footer } from "@/components/layout/footer";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { HoraDelDia } from "@/components/tinta/HoraDelDia";
import { BlueprintBadges } from "@/components/blueprint/BlueprintBadges";
import { BlueprintConstellation } from "@/components/blueprint/BlueprintConstellation";
import { SynthesisText } from "@/components/blueprint/SynthesisText";
import { getBlueprintBadges, type BlueprintBadge } from "@/components/blueprint/view-model";
import { buttonClasses } from "@/components/ui/button-classes";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

/**
 * Loads a shared map. Only what the public page shows leaves this function:
 * the first name, the five badges' inputs and the synthesis if it still
 * matches the profile. The full name and the exact birth date are never sent,
 * but the five badges together are enough to work the birth date out, which
 * is why sharing the map asks for confirmation first (BlueprintShare).
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

/**
 * The public Arcana Map, in two inks and complete without JavaScript (no
 * entrance animation, no client state): ink band with the brand and the hour
 * of the day, the hero with the first name and the five stamps, the synthesis
 * as a printed sheet and the call to make your own.
 */
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
    <div className="flex min-h-screen flex-col">
      <header className="suelo-tinta border-b border-papel/12 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-escena flex-wrap items-center gap-x-6 gap-y-2 px-gutter py-2">
          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center font-titulo text-[1.45rem] leading-none tracking-[0.01em] text-papel"
          >
            Arcana
          </Link>
          <HoraDelDia variante="larga" className="hidden text-niebla lg:block" />
          <Link href="/login" className={buttonClasses({ variant: "linea", size: "sm", className: "ml-auto" })}>
            {t("login")}
          </Link>
        </div>
        <div className="border-t border-papel/10 lg:hidden">
          <div className="mx-auto max-w-escena px-gutter py-1.5 text-niebla">
            <HoraDelDia variante="corta" className="text-[0.625rem] md:text-center" />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto grid w-full max-w-pliego flex-1 gap-14 px-gutter py-[clamp(32px,6vh,64px)] sm:gap-16"
      >
        <section
          aria-labelledby="shared-blueprint-title"
          className="grid items-center gap-10 border-b border-filete pb-10 sm:pb-12 md:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]"
        >
          <div className="grid min-w-0 justify-items-start gap-5">
            <Etiqueta>{t("eyebrow")}</Etiqueta>
            <h1 id="shared-blueprint-title" className="text-[clamp(2.2rem,1.4rem+2.8vw,3.75rem)] leading-[1.02]">
              {data.firstName ? t("title", { name: data.firstName }) : t("titleNoName")}
            </h1>
            <BlueprintBadges badges={badges} label={tBlueprint("badgesLabel")} />
            <p className="max-w-[56ch] text-[1.0625rem] leading-[1.65] text-letra-suave">{t("intro")}</p>
          </div>
          <BlueprintConstellation
            badges={badges}
            center={initial}
            className="justify-self-center md:justify-self-end lg:w-72"
          />
        </section>

        <section
          aria-labelledby="shared-synthesis-title"
          className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14"
        >
          <header className="grid content-start gap-3">
            <Etiqueta>{tBlueprint("synthesis.eyebrow")}</Etiqueta>
            <h2 id="shared-synthesis-title" className="text-[clamp(1.9rem,1.4rem+1.6vw,2.6rem)] leading-[1.05]">
              {t("synthesisTitle")}
            </h2>
          </header>
          <div className="min-w-0">
            {data.synthesis ? (
              <SynthesisText
                text={data.synthesis}
                lang={data.synthesisLocale}
                questionsTitle={tBlueprint("synthesis.questionsTitle")}
              />
            ) : (
              <p className="border-l-2 border-rosa pl-4 text-[1.0625rem] leading-[1.6] text-letra-suave">
                {t("noSynthesis")}
              </p>
            )}
            <p className="mt-8 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
              {tBlueprint("synthesis.disclaimer")}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="shared-blueprint-cta"
          className="grid gap-5 border-y border-filete py-10 sm:py-12 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end"
        >
          <div className="grid gap-3">
            <h2 id="shared-blueprint-cta" className="text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]">
              {t("ctaTitle")}
            </h2>
            <p className="max-w-[46ch] text-[1.0625rem] leading-[1.6] text-letra-suave">{t("ctaText")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link href="/register" className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}>
              {t("cta")}
            </Link>
            <Link href="/login" className={buttonClasses({ variant: "fantasma", size: "md" })}>
              {t("login")}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
