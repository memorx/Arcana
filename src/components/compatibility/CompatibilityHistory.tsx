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

/**
 * Previous readings for two as an archive: one ruled row each, the name in
 * Gloock, the dates in mono and the overall score as five small segments.
 */
export function CompatibilityHistory({ readings, locale }: CompatibilityHistoryProps) {
  const t = useTranslations("compatibility");

  if (readings.length === 0) {
    return (
      <p className="border-y border-filete/25 py-6 text-[1.0625rem] leading-[1.6] text-letra-suave italic">
        {t("previous.empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-filete/25 border-y border-filete">
      {readings.map((reading) => {
        const name = reading.partnerName || t("previous.noName");
        return (
          <li key={reading.id}>
            <Link
              href={`/compatibility/${reading.id}`}
              className="group grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 transition-colors hover:bg-papel-hondo/70 sm:px-3"
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate font-titulo text-[1.3rem] leading-[1.2] decoration-rosa underline-offset-4 group-hover:underline",
                    !reading.partnerName && "text-letra-suave italic"
                  )}
                >
                  {name}
                </p>
                <p className="mt-1 font-dato text-[0.625rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
                  {t("previous.bornOn", { date: formatBirthDate(reading.partnerBirthDate, locale) })}
                  <span aria-hidden="true"> · </span>
                  <br className="min-[420px]:hidden" />
                  {new Date(reading.createdAt).toLocaleDateString(dateLocale(locale), {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              {reading.overall !== null && (
                <div className="flex shrink-0 items-center gap-2.5">
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
                        data-filled={n <= (reading.overall ?? 0)}
                        className={cn(
                          "h-2 w-2.5 rounded-[1px] sm:w-3.5",
                          n <= (reading.overall ?? 0) ? "bg-rosa" : "border border-filete/45"
                        )}
                      />
                    ))}
                  </div>
                  <span aria-hidden="true" className="font-dato text-[0.8125rem] tabular-nums">
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
