import { getTranslations } from "next-intl/server";
import { ArcanaCalendar } from "@/components/calendar/ArcanaCalendar";
import { todayUtc } from "@/lib/systems";

/**
 * Arcana Calendar: public. Guests see the tonalli and the moon of every day;
 * with a profile, the personal day too (loaded by the client from /api/calendar).
 */
export default async function CalendarPage() {
  const t = await getTranslations("calendar");
  const today = todayUtc().toISOString().slice(0, 10);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="text-center mb-8">
        <p aria-hidden="true" className="text-3xl text-amber-400/80 mb-2">
          &#9790;
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto">{t("subtitle")}</p>
      </header>

      <ArcanaCalendar today={today} />
    </div>
  );
}
