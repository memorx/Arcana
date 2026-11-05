import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button, Card, CardContent } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getDayEnergies, getNumberMeaning, todayUtc } from "@/lib/systems";

interface TodayEnergiesWidgetProps {
  userId: string;
}

/** Dashboard row: today's tonalli, moon and personal day, with a link to /calendar. */
export async function TodayEnergiesWidget({ userId }: TodayEnergiesWidgetProps) {
  const t = await getTranslations("energies");
  const locale = (await getLocale()) === "en" ? "en" : "es";

  let birthDate: Date | null = null;
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true },
    });
    birthDate = profile?.birthDate ?? null;
  } catch (error) {
    // Without the profile the widget still shows the tonalli and the moon
    console.error("[energies] Could not load the birth date:", error);
  }

  const { tonalli, moon, personalDay } = getDayEnergies(todayUtc(), birthDate);
  const personal = personalDay !== null ? getNumberMeaning(personalDay) : null;

  const tile = "flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-2 sm:p-3 text-center min-w-0";

  return (
    <Card className="h-full border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-amber-900/10">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-100">{t("title")}</h3>
          <Link href="/calendar">
            <Button variant="secondary" size="sm">
              {t("calendarLink")}
            </Button>
          </Link>
        </div>

        <ul className="grid grid-cols-3 gap-2">
          <li className={tile}>
            <span aria-hidden="true" className="text-2xl leading-none">
              {tonalli.sign.glyph}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-slate-500">{t("tonalli")}</span>
            <span className="text-sm font-medium text-slate-100 break-words">
              {tonalli.number} {tonalli.sign.name[locale]}
            </span>
          </li>
          <li className={tile}>
            <span aria-hidden="true" className="text-2xl leading-none">
              {moon.emoji}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-slate-500">{t("moon")}</span>
            <span className="text-sm font-medium text-slate-100 break-words">{moon.name[locale]}</span>
          </li>
          <li className={tile}>
            {personal ? (
              <>
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-amber-500 text-sm font-bold text-slate-950"
                >
                  {personal.number}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500">{t("personalDay")}</span>
                <span className="text-sm font-medium text-slate-100 break-words">
                  <span className="sr-only">{personal.number} · </span>
                  {personal.name[locale]}
                </span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="text-2xl leading-none text-amber-400/70">
                  &#10022;
                </span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500">{t("personalDay")}</span>
                <Link
                  href="/profile/setup"
                  className="text-sm text-purple-300 hover:text-amber-300 hover:underline underline-offset-2"
                >
                  {t("addBirthDate")}
                </Link>
              </>
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
