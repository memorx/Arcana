import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
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
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { BlueprintBadges } from "@/components/blueprint/BlueprintBadges";
import { BlueprintConstellation } from "@/components/blueprint/BlueprintConstellation";
import { Reveal } from "@/components/blueprint/Reveal";
import { SynthesisPanel } from "@/components/blueprint/SynthesisPanel";
import { SystemCard, type SystemCardDetail } from "@/components/blueprint/SystemCard";
import {
  formatBirthDate,
  getBirthCardRoles,
  getBlueprintBadges,
  majorArcanaName,
  toRoman,
  traitList,
} from "@/components/blueprint/view-model";
import { ENLACE_DATO } from "@/components/blueprint/link-styles";
import { buttonClasses } from "@/components/ui/button-classes";

/** Columns of the birth-card row: one figure per role (1–3). */
const CARD_GRID: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

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
      <section
        aria-labelledby="blueprint-empty-title"
        data-estado="sin-perfil"
        className="mx-auto grid max-w-4xl items-center gap-10 border-y border-filete py-10 sm:py-14 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      >
        <div className="grid justify-items-start gap-5">
          <Etiqueta>{t("eyebrow")}</Etiqueta>
          <h1 id="blueprint-empty-title" className="text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[1.05]">
            {t("noProfile.title")}
          </h1>
          <p className="max-w-[48ch] text-[1.125rem] leading-[1.65] text-letra-suave">{t("noProfile.description")}</p>
          <Link href="/profile/setup" className={buttonClasses({ size: "lg" })}>
            {t("noProfile.cta")}
          </Link>
        </div>
        <BlueprintConstellation badges={[]} center="?" className="justify-self-center md:justify-self-end" />
      </section>
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
    <div className="grid gap-14 sm:gap-16">
      {/* Hero: first name, the five stamps and the map glyph */}
      <Reveal>
        <section
          aria-labelledby="blueprint-title"
          className="grid items-center gap-10 border-b border-filete pb-10 sm:pb-12 md:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]"
        >
          <div className="grid min-w-0 justify-items-start gap-5">
            <Etiqueta>{t("eyebrow")}</Etiqueta>
            <h1 id="blueprint-title" className="text-[clamp(2.2rem,1.4rem+2.8vw,3.75rem)] leading-[1.02]">
              {firstName ? t("title", { name: firstName }) : t("titleNoName")}
            </h1>
            <p className="font-dato text-[0.6875rem] leading-[1.7] tracking-[0.08em] text-letra-suave uppercase">
              {t("bornOn", { date: formatBirthDate(bp.birthDate, locale) })}
              <span aria-hidden="true"> · </span>
              <br className="sm:hidden" />
              {t("moonAtBirth", { phase: bp.moonAtBirth.name[locale] })}
            </p>
            <BlueprintBadges badges={badges} label={t("badgesLabel")} />
            <p className="max-w-[56ch] text-[1.0625rem] leading-[1.65] text-letra-suave">{t("subtitle")}</p>
            <a href="#synthesis" className={ENLACE_DATO}>
              {t("toSynthesis")}
              <span aria-hidden="true" className="font-lectura text-base tracking-normal">
                ↓
              </span>
            </a>
          </div>
          <BlueprintConstellation
            badges={badges}
            center={initial}
            className="justify-self-center md:justify-self-end lg:w-72"
          />
        </section>
      </Reveal>

      {/* The five systems: one plate each, ruled like the home page's «Más que tarot» strip */}
      <section aria-labelledby="blueprint-systems-title">
        <h2 id="blueprint-systems-title" className="mb-5 text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]">
          {t("systemsTitle")}
        </h2>
        <ol data-laminas className="grid gap-px border-y border-filete bg-filete/25 md:grid-cols-2">
          <li data-lamina="tarot" className="bg-suelo md:col-span-2">
            <Reveal delay={60} className="h-full">
              <SystemCard
                numeral="I"
                disposicion="doble"
                symbol={toRoman(bp.birthCards.personality)}
                symbolIsText
                eyebrow={t("systems.tarot.title")}
                title={roles.map((r) => majorArcanaName(r.index, locale)).join(" · ")}
                description={t("systems.tarot.description")}
              >
                <ul className={`grid grid-cols-1 gap-6 sm:gap-8 ${CARD_GRID[roles.length] ?? "sm:grid-cols-3"}`}>
                  {roles.map(({ role, index }) => {
                    const info = MAJOR_ARCANA[index];
                    const name = majorArcanaName(index, locale);
                    return (
                      <li key={role} data-carta-natal={role} className="flex min-w-0 gap-4 sm:flex-col">
                        <Image
                          src={cartaImagen(info.name, "tinta")}
                          alt={name}
                          width={MEDIDAS_CARTA.tinta.width}
                          height={MEDIDAS_CARTA.tinta.height}
                          sizes="(min-width: 640px) 200px, 96px"
                          unoptimized
                          className="h-auto w-24 shrink-0 rounded-[6px] border border-filete/20 bg-papel sm:w-full sm:max-w-[200px]"
                        />
                        <div className="grid min-w-0 content-start gap-1.5">
                          <p className="font-dato text-[0.625rem] leading-[1.4] tracking-[0.12em] text-letra-acento uppercase">
                            {t(`systems.tarot.roles.${role}`)}
                          </p>
                          <p className="font-titulo text-[1.3rem] leading-[1.15]">
                            {name}{" "}
                            <span className="font-dato text-[0.75rem] tracking-[0.08em] text-letra-suave">
                              {toRoman(index)}
                            </span>
                          </p>
                          <p className="text-[0.9375rem] leading-[1.5] text-letra-suave">{info.keywords[locale]}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SystemCard>
            </Reveal>
          </li>

          <li data-lamina="western" className="bg-suelo">
            <Reveal delay={120} className="h-full">
              <SystemCard
                numeral="II"
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
              />
            </Reveal>
          </li>

          <li data-lamina="chinese" className="bg-suelo">
            <Reveal delay={180} className="h-full">
              <SystemCard
                numeral="III"
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
              />
            </Reveal>
          </li>

          <li data-lamina="tonalli" className="bg-suelo">
            <Reveal delay={240} className="h-full">
              <SystemCard
                numeral="IV"
                symbol={tonalli.sign.glyph}
                eyebrow={t("systems.tonalli.title")}
                title={`${tonalli.number} ${tonalli.sign.nahuatl}`}
                subtitle={`${tonalli.number} ${tonalli.sign.name[locale]} · ${t("systems.tonalli.subtitle")}`}
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
              />
            </Reveal>
          </li>

          <li data-lamina="numerology" className="bg-suelo">
            <Reveal delay={300} className="h-full">
              <SystemCard
                numeral="V"
                symbol={String(numerology.lifePath)}
                symbolIsText
                symbolSize="grande"
                eyebrow={t("systems.numerology.title")}
                title={t("systems.numerology.lifePathTitle", {
                  number: numerology.lifePath,
                  name: lifePath.name[locale],
                })}
                traits={traitList(lifePath.keywords[locale], locale)}
                description={lifePath.description[locale]}
                details={numerologyDetails}
              />
            </Reveal>
          </li>
        </ol>
      </section>

      {/* AI synthesis + share */}
      <Reveal delay={120}>
        <SynthesisPanel
          initialSynthesis={synthesis}
          isStale={isStale}
          initialShareId={arcana?.shareId ?? null}
          synthesisLocale={profileLocale}
          uiLocale={locale}
        />
      </Reveal>
    </div>
  );
}
