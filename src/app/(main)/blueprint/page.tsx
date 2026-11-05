import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, TarotCardStatic } from "@/components/ui";
import { FadeIn } from "@/components/animations";
import {
  CHINESE_ANIMAL_INFO,
  MAJOR_ARCANA,
  TONALPOHUALLI_INTRO,
  WESTERN_ELEMENT_NAMES,
  WESTERN_MODALITY_NAMES,
  getArcanaBlueprint,
  getNumberMeaning,
  type CoreNumber,
  type Locale,
} from "@/lib/systems";
import { blueprintInputsHash, getFirstName, toBlueprintLocale } from "@/lib/ai/blueprint-synthesis";
import {
  BlueprintBadges,
  BlueprintConstellation,
  ReducedMotion,
  SynthesisPanel,
  SystemCard,
  formatBirthDate,
  getBirthCardRoles,
  getBlueprintBadges,
  majorArcanaName,
  toRoman,
  traitList,
  type SystemCardDetail,
} from "@/components/blueprint";
import { linkButtonClass } from "@/components/blueprint/link-styles";

type BirthCardRecord = {
  name: string;
  nameEs: string;
  arcana: "MAJOR" | "MINOR";
  suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
  imageUrl: string | null;
};

const CARD_GRID: Record<number, string> = {
  1: "sm:grid-cols-1 sm:max-w-xs",
  2: "sm:grid-cols-2 sm:max-w-xl",
  3: "sm:grid-cols-3",
};

async function loadBirthCards(indices: number[]): Promise<Map<string, BirthCardRecord>> {
  try {
    const cards = await prisma.card.findMany({
      where: { name: { in: indices.map((i) => MAJOR_ARCANA[i].name) } },
      select: { name: true, nameEs: true, arcana: true, suit: true, number: true, imageUrl: true },
    });
    return new Map(cards.map((card) => [card.name, card]));
  } catch (error) {
    // The page still works with the card placeholders.
    console.error("Blueprint birth cards error:", error);
    return new Map();
  }
}

function numberWithName(n: CoreNumber, locale: Locale): string {
  return `${n} · ${getNumberMeaning(n).name[locale]}`;
}

export default async function BlueprintPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/blueprint");
  }
  const userId = session.user.id;

  const t = await getTranslations("blueprint");
  const locale = toBlueprintLocale(await getLocale());

  const [profile, arcana] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true, fullName: true, locale: true },
    }),
    prisma.arcanaProfile.findUnique({
      where: { userId },
      select: { synthesis: true, inputsHash: true, shareId: true },
    }),
  ]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl py-6 sm:py-12">
        <Card variant="highlighted">
          <CardContent className="p-6 pt-8 text-center sm:p-10">
            <div aria-hidden="true" className="text-5xl text-amber-300">
              ✦
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-100 text-balance">{t("noProfile.title")}</h1>
            <p className="mt-3 leading-relaxed text-slate-400">{t("noProfile.description")}</p>
            <Link href="/profile/setup" className={linkButtonClass("primary", "lg", "mt-6")}>
              {t("noProfile.cta")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bp = getArcanaBlueprint(profile.birthDate, profile.fullName);
  const profileLocale = toBlueprintLocale(profile.locale);
  const hash = blueprintInputsHash(profile.birthDate, profile.fullName, profileLocale);
  const synthesis = arcana && arcana.inputsHash === hash && arcana.synthesis.trim() ? arcana.synthesis : null;
  const isStale = Boolean(arcana) && !synthesis;

  const translate = (key: string, values?: Record<string, string | number>) => t(key, values);
  const badges = getBlueprintBadges(bp, locale, translate);
  const firstName = getFirstName(profile.fullName);
  const initial = Array.from(firstName)[0]?.toLocaleUpperCase(locale) ?? "✦";

  const roles = getBirthCardRoles(bp.birthCards);
  const birthCards = await loadBirthCards(roles.map((r) => r.index));

  const { western, chinese, tonalli, numerology } = bp;
  const lifePath = getNumberMeaning(numerology.lifePath);
  const currentYear = new Date().getUTCFullYear();

  const numerologyDetails: SystemCardDetail[] = [
    numerology.expression !== null
      ? { label: t("systems.numerology.expression"), value: numberWithName(numerology.expression, locale) }
      : null,
    numerology.soulUrge !== null
      ? { label: t("systems.numerology.soulUrge"), value: numberWithName(numerology.soulUrge, locale) }
      : null,
    numerology.personality !== null
      ? { label: t("systems.numerology.personality"), value: numberWithName(numerology.personality, locale) }
      : null,
    { label: t("systems.numerology.birthday"), value: numberWithName(numerology.birthday, locale) },
    {
      label: t("systems.numerology.personalYear", { year: currentYear }),
      value: numberWithName(numerology.personalYear, locale),
    },
  ].filter((d): d is SystemCardDetail => d !== null);

  return (
    <ReducedMotion>
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Hero */}
        <FadeIn>
          <section
            aria-labelledby="blueprint-title"
            className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-purple-950/70 via-slate-950 to-amber-950/30 px-5 py-8 sm:px-10 sm:py-12"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
            />
            <div className="relative flex flex-col items-center gap-8 md:flex-row md:gap-12">
              <BlueprintConstellation badges={badges} center={initial} />
              <div className="min-w-0 flex-1 text-center md:text-left">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-400">{t("eyebrow")}</p>
                <h1
                  id="blueprint-title"
                  className="mt-2 text-3xl font-bold text-slate-100 text-balance sm:text-4xl"
                >
                  {firstName ? t("title", { name: firstName }) : t("titleNoName")}
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  {t("bornOn", { date: formatBirthDate(bp.birthDate, locale) })}
                  <span aria-hidden="true"> · </span>
                  <br className="sm:hidden" />
                  {t("moonAtBirth", { phase: `${bp.moonAtBirth.emoji} ${bp.moonAtBirth.name[locale]}` })}
                </p>
                <BlueprintBadges
                  badges={badges}
                  label={t("badgesLabel")}
                  className="mt-5 justify-center md:justify-start"
                />
                <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-300 md:mx-0">
                  {t("subtitle")}
                </p>
                <a
                  href="#synthesis"
                  className="mt-5 inline-flex items-center gap-1 rounded text-sm font-medium text-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {t("toSynthesis")}
                  <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* The five systems */}
        <section aria-labelledby="blueprint-systems-title">
          <h2 id="blueprint-systems-title" className="mb-4 text-xl font-semibold text-slate-100">
            {t("systemsTitle")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FadeIn delay={0.05} className="md:col-span-2">
              <SystemCard
                symbol={toRoman(bp.birthCards.personality)}
                symbolIsText
                eyebrow={t("systems.tarot.title")}
                title={roles.map((r) => majorArcanaName(r.index, locale)).join(" · ")}
                description={t("systems.tarot.description")}
                accent="purple"
              >
                <ul className={`grid grid-cols-1 gap-3 ${CARD_GRID[roles.length] ?? "sm:grid-cols-3"}`}>
                  {roles.map(({ role, index }) => {
                    const info = MAJOR_ARCANA[index];
                    const record = birthCards.get(info.name);
                    return (
                      <li
                        key={role}
                        className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:flex-col sm:p-4 sm:text-center"
                      >
                        <TarotCardStatic
                          card={
                            record ?? {
                              name: info.name,
                              nameEs: info.nameEs,
                              arcana: "MAJOR",
                              suit: null,
                              number: index,
                              imageUrl: null,
                            }
                          }
                          size="md"
                          locale={locale}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wider text-purple-300">
                            {t(`systems.tarot.roles.${role}`)}
                          </p>
                          <p className="mt-0.5 font-medium text-slate-100">
                            {majorArcanaName(index, locale)}{" "}
                            <span className="font-serif text-sm text-slate-500">{toRoman(index)}</span>
                          </p>
                          <p className="mt-1 text-sm text-slate-400">{info.keywords[locale]}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SystemCard>
            </FadeIn>

            <FadeIn delay={0.1} className="h-full">
              <SystemCard
                symbol={western.emoji}
                eyebrow={t("systems.western.title")}
                title={western.name[locale]}
                subtitle={`${WESTERN_ELEMENT_NAMES[western.element][locale]} · ${
                  WESTERN_MODALITY_NAMES[western.modality][locale]
                } · ${t("systems.western.ruler", { ruler: western.ruler[locale] })}`}
                traits={traitList(western.traits[locale], locale)}
                description={western.description[locale]}
                details={[
                  { label: t("systems.western.card"), value: majorArcanaName(western.tarotArcana, locale) },
                ]}
                accent="amber"
              />
            </FadeIn>

            <FadeIn delay={0.15} className="h-full">
              <SystemCard
                symbol={chinese.emoji}
                eyebrow={t("systems.chinese.title")}
                title={chinese.label[locale]}
                subtitle={`${chinese.polarity} · ${t("systems.chinese.year", { year: chinese.year })}`}
                traits={traitList(chinese.traits[locale], locale)}
                description={chinese.description[locale]}
                details={[
                  {
                    label: t("systems.chinese.allies"),
                    value: chinese.trine.map((animal) => CHINESE_ANIMAL_INFO[animal].name[locale]).join(", "),
                  },
                  {
                    label: t("systems.chinese.secretFriend"),
                    value: CHINESE_ANIMAL_INFO[chinese.secretFriend].name[locale],
                  },
                ]}
                accent="purple"
              />
            </FadeIn>

            <FadeIn delay={0.2} className="h-full">
              <SystemCard
                symbol={tonalli.sign.glyph}
                eyebrow={t("systems.tonalli.title")}
                title={tonalli.label[locale]}
                subtitle={t("systems.tonalli.subtitle")}
                traits={traitList(tonalli.sign.traits[locale], locale)}
                description={tonalli.sign.meaning[locale]}
                details={[
                  {
                    label: t("systems.tonalli.trecena"),
                    value: `${tonalli.trecena.nahuatl} · ${tonalli.trecena.name[locale]}`,
                  },
                  { label: t("systems.tonalli.direction"), value: tonalli.sign.direction[locale] },
                  { label: t("systems.tonalli.patron"), value: tonalli.sign.patron },
                  { label: t("systems.tonalli.lordOfNight"), value: tonalli.lordOfNight.nahuatl },
                ]}
                footnote={TONALPOHUALLI_INTRO[locale]}
                accent="emerald"
              />
            </FadeIn>

            <FadeIn delay={0.25} className="h-full">
              <SystemCard
                symbol={String(numerology.lifePath)}
                symbolIsText
                eyebrow={t("systems.numerology.title")}
                title={t("systems.numerology.lifePathTitle", {
                  number: numerology.lifePath,
                  name: lifePath.name[locale],
                })}
                traits={traitList(lifePath.keywords[locale], locale)}
                description={lifePath.description[locale]}
                details={numerologyDetails}
                accent="amber"
              />
            </FadeIn>
          </div>
        </section>

        {/* AI synthesis + share */}
        <FadeIn delay={0.1}>
          <SynthesisPanel
            initialSynthesis={synthesis}
            isStale={isStale}
            initialShareId={arcana?.shareId ?? null}
            synthesisLocale={profileLocale}
            uiLocale={locale}
          />
        </FadeIn>
      </div>
    </ReducedMotion>
  );
}
