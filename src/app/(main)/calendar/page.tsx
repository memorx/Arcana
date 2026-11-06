import { getLocale, getTranslations } from "next-intl/server";
import { ArcanaCalendar } from "@/components/calendar/ArcanaCalendar";
import { SignosDelDia } from "@/components/calendar/SignosDelDia";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { todayUtc } from "@/lib/systems";

// "Today" is computed per request; never serve a cached day.
export const dynamic = "force-dynamic";

/**
 * Arcana Calendar: public. Guests see the tonalli and the moon of every day;
 * with a profile, the personal day too (loaded by the client from /api/calendar).
 */
export default async function CalendarPage() {
  const t = await getTranslations("calendar");
  const locale = (await getLocale()) === "en" ? "en" : "es";
  const today = todayUtc().toISOString().slice(0, 10);

  return (
    <div>
      <header className="mb-8 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-end md:gap-12">
        <div className="grid gap-4">
          <Etiqueta>{t("etiqueta")}</Etiqueta>
          <h1 className="font-titulo text-[clamp(2.2rem,1.4rem+2.6vw,3.6rem)] leading-[1.05] text-letra">{t("title")}</h1>
        </div>
        <p className="max-w-[52ch] font-lectura text-lg leading-relaxed text-letra-suave">{t("subtitle")}</p>
      </header>

      <SignosDelDia hoy={today} locale={locale} etiqueta={t("signos")} className="-mx-gutter mb-10 sm:mb-12" />

      <ArcanaCalendar today={today} />
    </div>
  );
}
