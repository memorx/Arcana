"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Badge, buttonClasses } from "@/components/ui";
import { TodayEnergies } from "@/components/energies/TodayEnergies";
import { CartaQuemable } from "@/components/tinta/CartaQuemable";
import { TransicionPincel } from "@/components/tinta/TransicionPincel";
import { ReversoCarta } from "@/components/tinta/ReversoCarta";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { Pincel } from "@/components/tinta/Pincel";
import { cartaImagen, MEDIDAS_CARTA, slugCarta } from "@/lib/cartas";
import { getTonalli, todayUtc } from "@/lib/systems";

interface DailyReading {
  id: string;
  date: string;
  cardId: string;
  isReversed: boolean;
  interpretation: string;
  sentAt: string | null;
  card: {
    id: string;
    name: string;
    nameEs: string;
    arcana: string;
    suit: string | null;
  };
}

interface Subscription {
  status: string;
  freeReadingsUsed: number;
  freeReadingsPerMonth: number;
  paymentMethod?: string;
}

/**
 * Today's card stays turned over once it has been burned (per reading, in this browser): a
 * convenience, so coming back later the same day doesn't hide the message again.
 */
const claveRevelada = (id: string) => `arcana:carta-del-dia:${id}`;

function leerRevelada(id: string): boolean {
  try {
    return window.localStorage.getItem(claveRevelada(id)) === "1";
  } catch {
    return false;
  }
}

function guardarRevelada(id: string) {
  try {
    window.localStorage.setItem(claveRevelada(id), "1");
  } catch {
    // Private mode or blocked storage: the card simply starts face down next time.
  }
}

/** Daily cards are UTC days (`@db.Date`): format them in UTC so Mexico doesn't see the day before. */
const DIA_UTC = { timeZone: "UTC" } as const;

/** Paper card back used where there is nothing to burn yet (preview, waiting for the first card). */
function CartaBocaAbajo({ children }: { children?: ReactNode }) {
  return (
    <div className="relative aspect-[300/520] w-[min(300px,70vw)] overflow-hidden rounded-[14px] shadow-[0_24px_48px_-28px_rgb(0_0_0/.6)] md:w-[min(340px,34vw)]">
      <ReversoCarta />
      {children}
    </div>
  );
}

export default function DailyPage() {
  const t = useTranslations("daily");
  const tCarta = useTranslations("carta");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-ES";

  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [todayReading, setTodayReading] = useState<DailyReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<DailyReading[]>([]);
  const [emailTime, setEmailTime] = useState("08:00");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [revelada, setRevelada] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, dailyRes, profileRes] = await Promise.all([
          fetch("/api/subscription"),
          fetch("/api/daily-reading"),
          fetch("/api/profile"),
        ]);

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.subscription);
        }

        if (dailyRes.ok) {
          const dailyData = await dailyRes.json();
          setTodayReading(dailyData.today);
          setRecentReadings(dailyData.recent || []);
          setRevelada(dailyData.today?.id ? leerRevelada(dailyData.today.id) : false);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile?.emailTime) {
            setEmailTime(profileData.profile.emailTime);
          }
          if (profileData.profile?.birthDate) {
            const parsed = new Date(profileData.profile.birthDate);
            if (!Number.isNaN(parsed.getTime())) setBirthDate(parsed);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const todayId = todayReading?.id;
  const onRevelada = useCallback(() => {
    setRevelada(true);
    if (todayId) guardarRevelada(todayId);
  }, [todayId]);

  const getCardName = (card: { name: string; nameEs: string }) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  const hasActiveSubscription = subscription?.status === "active";
  const isCreditsExhausted = subscription?.status === "credits_exhausted";

  const hoy = todayUtc();
  const tonalli = getTonalli(hoy);
  const etiquetaDia = `${t("todayCard")} · ${tonalli.number} ${tonalli.sign.nahuatl}`;

  /** The scene on ink: title on top, the card, and what goes under it (message, waiting, CTA). */
  const escena = (titulo: string, carta: ReactNode, debajo: ReactNode) => (
    <Escena
      suelo="tinta"
      aria-labelledby="daily-titulo"
      className="-mx-gutter px-gutter py-[clamp(48px,9vh,112px)]"
    >
      <div className="mx-auto grid max-w-[1100px] gap-x-[clamp(32px,6vw,96px)] gap-y-8 [grid-template-areas:'cabeza'_'carta'_'debajo'] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:[grid-template-areas:'cabeza_carta'_'debajo_carta']">
        <div className="grid content-end gap-4 [grid-area:cabeza]">
          <Etiqueta>{etiquetaDia}</Etiqueta>
          <Pincel aria-hidden="true" className="-ml-[0.04em] text-[clamp(3.5rem,2rem+5vw,5.5rem)]">
            {t("pincel")}
          </Pincel>
          <h1 id="daily-titulo" className="font-titulo text-[clamp(2rem,1.3rem+2.4vw,3.4rem)] leading-[1.05] text-letra">
            {titulo}
          </h1>
        </div>
        <div className="justify-self-center [grid-area:carta] md:self-center">{carta}</div>
        <div className="min-w-0 [grid-area:debajo]">{debajo}</div>
      </div>
    </Escena>
  );

  let contenido: ReactNode;

  if (isLoading) {
    contenido = (
      <div aria-busy="true">
        <Escena suelo="tinta" className="-mx-gutter px-gutter py-[clamp(48px,9vh,112px)]">
          <div className="mx-auto grid max-w-[1100px] items-center gap-10 md:grid-cols-2">
            <div className="space-y-4" aria-hidden="true">
              <div className="h-3 w-40 bg-papel/10 motion-safe:animate-pulse" />
              <div className="h-12 w-3/4 bg-papel/10 motion-safe:animate-pulse" />
              <div className="h-4 w-2/3 bg-papel/10 motion-safe:animate-pulse" />
            </div>
            <div
              aria-hidden="true"
              className="aspect-[300/520] w-[min(300px,70vw)] justify-self-center rounded-[14px] bg-papel/10 motion-safe:animate-pulse md:w-[min(340px,34vw)]"
            />
          </div>
        </Escena>
      </div>
    );
  } else if (isCreditsExhausted) {
    // Credits exhausted - show resubscribe CTA
    contenido = escena(
      t("creditsExhausted"),
      <CartaBocaAbajo />,
      <div className="grid max-w-[44ch] gap-6">
        <p className="font-lectura text-lg leading-relaxed text-letra-suave">{t("creditsExhaustedDesc")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/credits" className={buttonClasses({ size: "lg" })}>
            {t("buyCredits")}
          </Link>
          <Link href="/subscribe" className={buttonClasses({ variant: "linea", size: "lg" })}>
            {t("resubscribe")}
          </Link>
        </div>
      </div>
    );
  } else if (!hasActiveSubscription) {
    // No subscription - show CTA
    contenido = escena(
      t("noSubscription"),
      <CartaBocaAbajo>
        <span className="absolute inset-x-0 bottom-[12%] flex justify-center">
          <Badge variant="warning">{t("preview")}</Badge>
        </span>
      </CartaBocaAbajo>,
      <div className="grid max-w-[44ch] gap-6">
        <p className="font-lectura text-lg leading-relaxed text-letra-suave">{t("noSubscriptionDesc")}</p>
        <Link href="/subscribe" className={buttonClasses({ size: "lg", className: "justify-self-start" })}>
          {t("subscribeNow")}
        </Link>
      </div>
    );
  } else if (todayReading) {
    const nombre = getCardName(todayReading.card);
    const parrafos = todayReading.interpretation
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    contenido = escena(
      t("title"),
      <CartaQuemable
        key={todayReading.card.id}
        carta={{ nombre, slug: slugCarta(todayReading.card.name) }}
        invertida={todayReading.isReversed}
        revelada={revelada}
        onRevelada={onRevelada}
        etiqueta={tCarta("voltearPosicion", { posicion: t("todayCard") })}
        tamano="grande"
        prioridad
      />,
      revelada ? (
        <article aria-labelledby="daily-carta" className="grid max-w-[60ch] gap-4 motion-safe:animate-entra">
          <p className="font-dato text-xs uppercase tracking-[0.12em] text-letra-acento">
            {new Date(todayReading.date).toLocaleDateString(dateLocale, {
              ...DIA_UTC,
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 id="daily-carta" className="font-titulo text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] leading-tight text-letra">
              {nombre}
            </h2>
            {todayReading.isReversed && <Badge variant="warning">{t("reversed")}</Badge>}
          </div>
          <div className="space-y-4 font-lectura text-lg leading-[1.7] text-letra">
            {parrafos.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {todayReading.sentAt && (
            <p className="font-dato text-[0.6875rem] uppercase tracking-[0.1em] text-letra-suave">
              {t("sentAt", {
                time: new Date(todayReading.sentAt).toLocaleTimeString(dateLocale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          )}
        </article>
      ) : (
        <p className="max-w-[40ch] font-lectura text-lg leading-relaxed text-letra-suave">{t("boca")}</p>
      )
    );
  } else {
    // Subscribed, but today's card hasn't been drawn yet (the cron draws it)
    contenido = escena(
      t("title"),
      <CartaBocaAbajo />,
      <div className="grid max-w-[44ch] gap-2">
        <p className="font-titulo text-2xl leading-tight text-letra">{t("noCardYet")}</p>
        <p className="font-lectura text-lg text-letra-suave">{t("cardWillArrive", { time: emailTime })}</p>
      </div>
    );
  }

  return (
    <>
      {/* The brush sweep plays once when you arrive at /daily (§5.4), whatever state loads */}
      <TransicionPincel />
      {contenido}

      {!isLoading && !isCreditsExhausted && hasActiveSubscription && (
        <div className="mt-[clamp(48px,8vh,88px)] space-y-[clamp(48px,8vh,88px)]">
          {/* Today's energies: tonalli, moon and personal day */}
          <TodayEnergies date={todayUtc()} birthDate={birthDate} />

          {/* Recent Cards History */}
          {recentReadings.length > 0 && (
            <section aria-labelledby="daily-historial">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-filete pb-2">
                <h2 id="daily-historial" className="font-titulo text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-tight text-letra">
                  {t("history")}
                </h2>
                <p className="font-dato text-[0.6875rem] uppercase tracking-[0.12em] text-letra-suave">{t("last7days")}</p>
              </div>
              <ol className="grid grid-cols-2 gap-x-4 gap-y-2 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
                {recentReadings.map((reading) => {
                  const nombre = getCardName(reading.card);
                  return (
                    <li key={reading.id} className="flex min-w-0 flex-col gap-2 py-4">
                      <p className="font-dato text-[0.6875rem] uppercase tracking-[0.08em] text-letra-suave">
                        {new Date(reading.date).toLocaleDateString(dateLocale, {
                          ...DIA_UTC,
                          weekday: "short",
                          day: "numeric",
                        })}
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element -- grabado autohospedado (scripts/cartas.py) */}
                      <img
                        src={cartaImagen(reading.card, "tinta")}
                        alt={nombre}
                        width={MEDIDAS_CARTA.tinta.width}
                        height={MEDIDAS_CARTA.tinta.height}
                        loading="lazy"
                        decoding="async"
                        className={`h-auto w-full max-w-[120px] rounded-[4px] border border-filete/30 ${
                          reading.isReversed ? "rotate-180" : ""
                        }`}
                      />
                      <p className="font-titulo text-[0.9375rem] leading-tight text-letra">{nombre}</p>
                      {reading.isReversed && (
                        <Badge variant="primary" className="self-start">
                          {t("reversed")}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      )}
    </>
  );
}
