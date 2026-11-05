"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Card, CardContent } from "@/components/ui";
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <Card className="min-w-0">
        <CardContent className="p-3 sm:p-6">
          {/* Month navigation */}
          <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => select(shiftMonthKeepingDay(selected, -1))}
              aria-label={t("previousMonth")}
            >
              <ChevronIcon direction="left" />
            </Button>
            <h2
              id={headingId}
              aria-live="polite"
              className="text-lg sm:text-xl font-semibold text-slate-100 text-center first-letter:uppercase"
            >
              {formatMonthYear(view.year, view.month, locale)}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => select(today)}
                aria-label={t("goToToday")}
              >
                {t("today")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => select(shiftMonthKeepingDay(selected, 1))}
                aria-label={t("nextMonth")}
              >
                <ChevronIcon direction="right" />
              </Button>
            </div>
          </div>

          {/* Month grid */}
          <table role="grid" aria-labelledby={headingId} className="w-full table-fixed border-separate border-spacing-0.5 sm:border-spacing-1">
            <thead>
              <tr>
                {weekdays.map((day) => (
                  <th key={day.long} scope="col" className="pb-1 sm:pb-2 text-xs font-medium text-slate-400">
                    <span aria-hidden="true" className="sm:hidden">
                      {day.narrow}
                    </span>
                    <span aria-hidden="true" className="hidden sm:inline">
                      {day.short}
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
                    if (!key) return <td key={`pad-${w}-${i}`} aria-hidden="true" />;
                    const { energies: day, label } = days.get(key)!;
                    const isSelected = key === selected;
                    const isToday = key === today;
                    return (
                      <td key={key} role="gridcell" aria-selected={isSelected} className="p-0 align-top">
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
                            "flex w-full min-h-[3.75rem] sm:min-h-[5.25rem] flex-col rounded-lg border p-1 sm:p-2 text-left transition-colors",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950",
                            isSelected
                              ? "border-purple-400/80 bg-purple-900/40"
                              : "border-slate-800 bg-slate-900/40 hover:border-purple-500/50 hover:bg-slate-900/80",
                            isToday && !isSelected && "border-amber-500/60"
                          )}
                        >
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-semibold leading-none",
                              isToday ? "text-amber-300" : "text-slate-300"
                            )}
                          >
                            {Number(key.slice(8))}
                          </span>
                          <span
                            aria-hidden="true"
                            className="mt-1 flex flex-wrap items-center justify-center gap-0.5 text-[13px] sm:text-lg leading-none"
                          >
                            <span>{day.tonalli.sign.glyph}</span>
                            <span>{day.moon.emoji}</span>
                          </span>
                          {day.personalDay !== null && (
                            <span
                              aria-hidden="true"
                              className="mt-auto pt-1 text-center text-[10px] sm:text-xs font-medium leading-none text-amber-300/90"
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
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <li>
              <span aria-hidden="true">🐊</span> {t("legend.sign")}
            </li>
            <li>
              <span aria-hidden="true">🌕</span> {t("legend.moon")}
            </li>
            {profile.birthDate && (
              <li>
                <span aria-hidden="true" className="font-medium text-amber-300/90">
                  1–9
                </span>{" "}
                {t("legend.personalDay")}
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs text-slate-400 sr-only sm:not-sr-only">{t("keyboardHint")}</p>
        </CardContent>
      </Card>

      <div ref={detailRef} className="scroll-mt-24 lg:sticky lg:top-24">
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
