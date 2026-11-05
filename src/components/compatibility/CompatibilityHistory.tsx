import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface CompatibilityHistoryItem {
  id: string;
  partnerName: string | null;
  /** "YYYY-MM-DD" */
  partnerBirthDate: string;
  overall: number | null;
  createdAt: string;
}

interface CompatibilityHistoryProps {
  readings: CompatibilityHistoryItem[];
  locale: string;
}

const dateLocale = (locale: string) => (locale === "en" ? "en-US" : "es-MX");

/** Birth dates are stored at midnight UTC: format them in UTC so they never shift a day. */
function formatBirthDate(isoDay: string, locale: string) {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString(dateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Previous readings for two: name, birth date, date of the reading and overall score. */
export function CompatibilityHistory({ readings, locale }: CompatibilityHistoryProps) {
  const t = useTranslations("compatibility");

  if (readings.length === 0) {
    return <p className="text-sm text-slate-500">{t("previous.empty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {readings.map((reading) => {
        const name = reading.partnerName || t("previous.noName");
        return (
          <li key={reading.id}>
            <Link
              href={`/compatibility/${reading.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-purple-500/50 hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <div className="min-w-0">
                <p className={cn("truncate font-medium", reading.partnerName ? "text-slate-100" : "text-slate-400")}>
                  {name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t("previous.bornOn", { date: formatBirthDate(reading.partnerBirthDate, locale) })} ·{" "}
                  {new Date(reading.createdAt).toLocaleDateString(dateLocale(locale), {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              {reading.overall !== null && (
                <div className="flex shrink-0 items-center gap-2">
                  <div
                    role="meter"
                    aria-label={t("meterAria", { system: t("systems.overall"), score: reading.overall })}
                    aria-valuemin={1}
                    aria-valuemax={5}
                    aria-valuenow={reading.overall}
                    className="flex gap-0.5"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        aria-hidden="true"
                        className={cn(
                          "h-1.5 w-3 rounded-full sm:w-4",
                          n <= (reading.overall ?? 0) ? "bg-gradient-to-r from-purple-500 to-amber-400" : "bg-slate-800"
                        )}
                      />
                    ))}
                  </div>
                  <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-amber-300">
                    {t("scoreOutOf", { score: reading.overall })}
                  </span>
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
