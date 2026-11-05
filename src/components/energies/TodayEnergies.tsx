import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";
import { describeDayEnergies, getDayEnergies, getNumberMeaning } from "@/lib/systems";

interface TodayEnergiesProps {
  /** The day, at 00:00 UTC (use `todayUtc()`). */
  date: Date;
  /** From `UserProfile.birthDate`; without it the personal day becomes a CTA. */
  birthDate?: Date | null;
  className?: string;
}

function EnergyTile({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 min-w-0">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center text-3xl leading-none">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-sm font-medium text-slate-100">{children}</div>
      </div>
    </li>
  );
}

/**
 * Today's tonalli, moon and personal day above the daily card, with the
 * same plain-text summary (`describeDayEnergies`) the AI receives.
 */
export function TodayEnergies({ date, birthDate = null, className }: TodayEnergiesProps) {
  const t = useTranslations("energies");
  const locale = useLocale() === "en" ? "en" : "es";
  const energies = getDayEnergies(date, birthDate);
  const { tonalli, moon, personalDay } = energies;
  const personal = personalDay !== null ? getNumberMeaning(personalDay) : null;
  const lines = describeDayEnergies(energies, locale).split("\n");

  return (
    <section aria-labelledby="today-energies-title" className={className}>
      <Card className="border-purple-500/20 bg-gradient-to-r from-purple-900/20 via-slate-900/50 to-amber-900/10">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="today-energies-title"
              className="text-xs uppercase tracking-[0.2em] text-amber-400/80"
            >
              {t("title")}
            </h2>
            <Link
              href="/calendar"
              className="rounded text-sm text-purple-300 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {t("calendarLink")} <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3">
            <EnergyTile icon={tonalli.sign.glyph} label={t("tonalli")}>
              {tonalli.label[locale]}
            </EnergyTile>
            <EnergyTile icon={moon.emoji} label={t("moon")}>
              {moon.name[locale]} · {t("illumination", { percent: Math.round(moon.illumination * 100) })}
            </EnergyTile>
            <EnergyTile
              icon={
                personal ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-amber-500 text-base font-bold text-slate-950">
                    {personal.number}
                  </span>
                ) : (
                  "✦"
                )
              }
              label={t("personalDay")}
            >
              {personal ? (
                t("personalDayValue", { number: personal.number, name: personal.name[locale] })
              ) : (
                <Link href="/profile/setup" className="text-purple-300 hover:text-amber-300 underline-offset-2 hover:underline">
                  {t("addBirthDate")}
                </Link>
              )}
            </EnergyTile>
          </ul>

          <div className="mt-4 space-y-1 text-sm leading-relaxed text-slate-400">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
