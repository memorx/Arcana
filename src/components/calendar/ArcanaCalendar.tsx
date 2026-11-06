"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { LunaGlifo } from "@/components/energies/LunaGlifo";
import { getDayEnergies, type DayEnergies } from "@/lib/systems";
import { cn } from "@/lib/utils";
import {
  addDays,
  buildMonthGrid,
  dayMonthFormatter,
  formatMonthYear,
  fromDayKey,
  intlLocaleFor,
  isDayKey,
  monthOf,
  shiftMonthKeepingDay,
  toLocale,
  weekBounds,
  weekdayNames,
  weekStartFor,
} from "./calendar-utils";
import { DayDetail, type ProfileStatus } from "./DayDetail";

export interface ArcanaCalendarProps {
  /** Today as "YYYY-MM-DD" (UTC day). Computed on the server so SSR and hydration agree. */
  today: string;
}

interface ProfileState {
  status: ProfileStatus;
  birthDate: Date | null;
}

interface CalendarResponse {
  authenticated?: boolean;
  birthDate?: string | null;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}

/**
 * Month view of the Arcana Calendar. Each day shows its tonalpohualli sign,
 * the moon and (with a birth date) the personal day; the selected day opens
 * in a side panel (below on small screens). Everything is computed in the
 * browser with `@/lib/systems`; `/api/calendar` only provides the birth date.
 *
 * Keyboard: arrows move by day/week, Home/End to the week's edges,
 * PageUp/PageDown change month (with Shift, year).
 */
export function ArcanaCalendar({ today }: ArcanaCalendarProps) {
  const t = useTranslations("calendar");
  const locale = toLocale(useLocale());
  const weekStart = weekStartFor(locale);
  const headingId = useId();

  const [selected, setSelected] = useState(today);
  const [profile, setProfile] = useState<ProfileState>({ status: "loading", birthDate: null });

  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const detailRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);

  // Birth date for the personal day (null for guests and people without a profile)
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/calendar", { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<CalendarResponse>) : Promise.reject(res.status)))
      .then((data) => {
        if (data.authenticated === false) {
          setProfile({ status: "guest", birthDate: null });
        } else if (isDayKey(data.birthDate)) {
          setProfile({ status: "ready", birthDate: fromDayKey(data.birthDate) });
        } else {
          setProfile({ status: "no-profile", birthDate: null });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[calendar] Could not load the birth date:", error);
        setProfile({ status: "error", birthDate: null });
      });
    return () => controller.abort();
  }, []);

  // After keyboard navigation, move focus to the new day (possibly in another month)
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    cellRefs.current.get(selected)?.focus();
  }, [selected]);

  const view = monthOf(selected);
  const weekdays = useMemo(() => weekdayNames(locale, weekStart), [locale, weekStart]);
  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month, weekStart),
    [view.year, view.month, weekStart]
  );
  // Energies and the full aria-label of every day of the month, with one
  // date formatter per month (not one per cell)
  const days = useMemo(() => {
    const intl = intlLocaleFor(locale);
    const dayMonth = dayMonthFormatter(locale);
    const map = new Map<string, { energies: DayEnergies; label: string }>();
    for (const week of weeks) {
      for (const key of week) {
        if (!key) continue;
        const date = fromDayKey(key);
        const energies = getDayEnergies(date, profile.birthDate);
        const label = [
          dayMonth.format(date),
          `${energies.tonalli.number} ${energies.tonalli.sign.name[locale]}`,
          energies.moon.name[locale].toLocaleLowerCase(intl),
          energies.personalDay !== null ? t("personalDayAria", { number: energies.personalDay }) : null,
          key === today ? t("today").toLocaleLowerCase(intl) : null,
        ]
          .filter(Boolean)
          .join(", ");
        map.set(key, { energies, label });
      }
    }
    return map;
  }, [weeks, profile.birthDate, locale, today, t]);

  function select(key: string, { focus = false } = {}) {
    focusPending.current = focus;
    setSelected(key);
  }

  function showDetailOnSmallScreens() {
    const panel = detailRef.current;
    if (!panel || typeof window === "undefined" || typeof panel.scrollIntoView !== "function") return;
    if (!window.matchMedia?.("(max-width: 1023px)").matches) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function onCellKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    let next: string;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(key, -1);
        break;
      case "ArrowRight":
        next = addDays(key, 1);
        break;
      case "ArrowUp":
        next = addDays(key, -7);
        break;
      case "ArrowDown":
        next = addDays(key, 7);
        break;
      case "Home":
        next = weekBounds(key, weekStart).start;
        break;
      case "End":
        next = weekBounds(key, weekStart).end;
        break;
      case "PageUp":
        next = shiftMonthKeepingDay(key, event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = shiftMonthKeepingDay(key, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next, { focus: true });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
      <div className="min-w-0">
        {/* Month navigation */}
        <div className="mb-4 flex items-center gap-2 border-b border-filete pb-3">
          <Button
            variant="fantasma"
            size="sm"
            className="w-11 shrink-0 px-0"
            onClick={() => select(shiftMonthKeepingDay(selected, -1))}
            aria-label={t("previousMonth")}
          >
            <ChevronIcon direction="left" />
          </Button>
          <h2
            id={headingId}
            aria-live="polite"
            className="min-w-0 flex-1 text-center font-titulo text-xl leading-tight text-letra first-letter:uppercase sm:text-3xl"
          >
            {formatMonthYear(view.year, view.month, locale)}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="linea" size="sm" className="px-3" onClick={() => select(today)} aria-label={t("goToToday")}>
              {t("today")}
            </Button>
            <Button
              variant="fantasma"
              size="sm"
              className="w-11 px-0"
              onClick={() => select(shiftMonthKeepingDay(selected, 1))}
              aria-label={t("nextMonth")}
            >
              <ChevronIcon direction="right" />
            </Button>
          </div>
        </div>

        {/* Month grid */}
        <table role="grid" aria-labelledby={headingId} className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {weekdays.map((day) => (
                <th
                  key={day.long}
                  scope="col"
                  className="pb-2 text-center font-dato text-[0.6875rem] font-normal uppercase tracking-[0.08em] text-letra-suave"
                >
                  <span aria-hidden="true" className="sm:hidden">
                    {day.narrow}
                  </span>
                  <span aria-hidden="true" className="hidden sm:inline">
                    {day.short.replace(".", "")}
                  </span>
                  <span className="sr-only">{day.long}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, w) => (
              <tr key={week.find(Boolean) ?? w}>
                {week.map((key, i) => {
                  if (!key) {
                    return (
                      <td key={`pad-${w}-${i}`} aria-hidden="true" className="border border-filete/15 bg-papel-hondo/50" />
                    );
                  }
                  const { energies: day, label } = days.get(key)!;
                  const isSelected = key === selected;
                  const isToday = key === today;
                  return (
                    <td key={key} role="gridcell" aria-selected={isSelected} className="border border-filete/15 p-0 align-top">
                      <button
                        ref={(el) => {
                          if (el) cellRefs.current.set(key, el);
                          else cellRefs.current.delete(key);
                        }}
                        type="button"
                        tabIndex={isSelected ? 0 : -1}
                        aria-label={label}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => {
                          select(key);
                          showDetailOnSmallScreens();
                        }}
                        onKeyDown={(event) => onCellKeyDown(event, key)}
                        className={cn(
                          "relative flex min-h-14 w-full flex-col items-stretch gap-1 p-1.5 text-left transition-colors sm:min-h-[5.5rem] sm:p-2.5",
                          "focus-visible:z-10 focus-visible:outline-offset-[-3px]",
                          isSelected ? "bg-tinta text-papel [--luna-sombra:var(--color-grafito)]" : "text-tinta hover:bg-papel-hondo",
                          // Today in the second ink: a pink rule on top and a pink day number
                          isToday && "shadow-[inset_0_3px_0_var(--color-rosa)]"
                        )}
                      >
                        <span className="flex flex-col items-start gap-1 sm:flex-row sm:justify-between">
                          <span
                            className={cn(
                              "font-titulo text-base leading-none sm:text-xl",
                              isToday && (isSelected ? "text-rosa-luz" : "text-rosa-texto")
                            )}
                          >
                            {Number(key.slice(8))}
                          </span>
                          <LunaGlifo luna={day.moon} className="mt-px size-3 sm:size-4" />
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "hidden truncate font-dato text-[0.625rem] uppercase leading-tight tracking-[0.04em] sm:block",
                            isSelected ? "text-niebla" : "text-grafito"
                          )}
                        >
                          {day.tonalli.number} {day.tonalli.sign.nahuatl}
                        </span>
                        {day.personalDay !== null && (
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-auto font-dato text-[0.625rem] leading-none sm:text-[0.6875rem]",
                              isSelected ? "text-rosa-luz" : "text-rosa-texto"
                            )}
                          >
                            {day.personalDay}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-dato text-[0.6875rem] uppercase tracking-[0.08em] text-letra-suave">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="block h-[3px] w-5 bg-rosa" />
            {t("today")}
          </li>
          <li className="hidden items-center gap-2 sm:flex">
            <span aria-hidden="true" className="text-letra">
              1 Cipactli
            </span>
            {t("legend.sign")}
          </li>
          <li className="flex items-center gap-2">
            <LunaGlifo luna={{ illumination: 0.5, age: 7.4 }} className="size-4 text-letra" />
            {t("legend.moon")}
          </li>
          {profile.birthDate && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="text-letra-acento">
                1–9
              </span>
              {t("legend.personalDay")}
            </li>
          )}
        </ul>
        <p className="mt-2 font-lectura text-[0.9375rem] text-letra-suave sr-only sm:not-sr-only">{t("keyboardHint")}</p>
      </div>

      <div ref={detailRef} className="scroll-mt-(--alto-cabecera) lg:sticky lg:top-[calc(var(--alto-cabecera)+1rem)]">
        <DayDetail
          dayKey={selected}
          birthDate={profile.birthDate}
          profileStatus={profile.status}
          locale={locale}
          isToday={selected === today}
        />
      </div>
    </div>
  );
}
