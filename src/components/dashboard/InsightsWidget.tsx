import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCardOfTheMonth } from "@/lib/insights";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { ENLACE_DATO, TITULO_CELDA } from "./estilos";

interface InsightsWidgetProps {
  userId: string;
}

/** Dashboard: the card that came up most this month, with a link to "Mi historia". */
export async function InsightsWidget({ userId }: InsightsWidgetProps) {
  const t = await getTranslations("insights.widget");
  const locale = await getLocale();

  let data: Awaited<ReturnType<typeof getCardOfTheMonth>>;
  let totalReadings = 0;
  try {
    data = await getCardOfTheMonth(userId);
    if (!data.card) {
      totalReadings = await prisma.reading.count({ where: { userId } });
    }
  } catch (error) {
    // A widget must never take the dashboard down.
    console.error("Error loading insights widget:", error);
    return null;
  }

  const { card } = data;

  // No readings at all: a short invitation
  if (!card && totalReadings === 0) {
    return (
      <div className="flex h-full flex-col gap-3">
        <h2 className={TITULO_CELDA}>{t("emptyTitle")}</h2>
        <p className="font-lectura text-[0.9375rem] leading-snug text-letra-suave">{t("emptyBody")}</p>
        <Link href="/reading/new" className={buttonClasses({ variant: "linea", size: "sm", className: "mt-auto self-start" })}>
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  // Readings, but none this month yet
  if (!card) {
    return (
      <div className="flex h-full flex-col gap-3">
        <h2 className={TITULO_CELDA}>{t("title")}</h2>
        <p className="font-lectura text-[0.9375rem] leading-snug text-letra-suave">{t("noReadingsMonth")}</p>
        <Link href="/history/insights" className={`${ENLACE_DATO} mt-auto self-start`}>
          {t("viewStory")} <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  const name = locale === "en" ? card.name : card.nameEs;

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className={TITULO_CELDA}>{t("title")}</h2>
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- grabado autohospedado (scripts/cartas.py) */}
        <img
          src={cartaImagen(card, "tinta")}
          alt=""
          width={MEDIDAS_CARTA.tinta.width}
          height={MEDIDAS_CARTA.tinta.height}
          loading="lazy"
          decoding="async"
          className="h-auto w-16 shrink-0 rounded-[4px] border border-filete/30"
        />
        <div className="min-w-0">
          <p className="break-words font-titulo text-xl leading-tight text-letra">{name}</p>
          <p className="mt-1 font-dato text-xs tabular-nums text-letra-acento">{t("count", { count: card.count })}</p>
          <Link href="/history/insights" className={ENLACE_DATO}>
            {t("viewStory")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
