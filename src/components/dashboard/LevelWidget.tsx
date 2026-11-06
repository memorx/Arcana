import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getUserLevelProgress } from "@/lib/xp";
import { LEVELS } from "@/lib/levels";
import { Barra } from "./Barra";
import { ENLACE_DATO, ROTULO, TITULO_CELDA } from "./estilos";

interface LevelWidgetProps {
  userId: string;
}

/**
 * Where "see progress" leads. There is no /progress page: XP comes from readings,
 * achievements and streaks, and the achievements page is where that progress lives.
 */
export const LEVEL_PROGRESS_HREF = "/achievements";

export async function LevelWidget({ userId }: LevelWidgetProps) {
  const t = await getTranslations("levels");
  const locale = await getLocale();

  const levelProgress = await getUserLevelProgress(userId);
  const displayName = locale === "en" ? levelProgress.levelName : levelProgress.levelNameEs;

  // Calculate XP needed for next level
  const xpInCurrentLevel = levelProgress.xp - levelProgress.xpForCurrentLevel;
  const xpNeededForNext = levelProgress.xpForNextLevel
    ? levelProgress.xpForNextLevel - levelProgress.xpForCurrentLevel
    : 0;

  // Get next level info
  const nextLevel = LEVELS.find((l) => l.level === levelProgress.level + 1);
  const nextLevelName = nextLevel
    ? locale === "en"
      ? nextLevel.name
      : nextLevel.nameEs
    : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={TITULO_CELDA}>
          {t("level")} {levelProgress.level}
        </h2>
        <Link href={LEVEL_PROGRESS_HREF} className={ENLACE_DATO}>
          {t("viewAchievements")} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Sello del nivel: el número en Gloock dentro de un anillo, como el reverso de la carta */}
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full border border-filete font-titulo text-2xl leading-none text-letra shadow-[inset_0_0_0_3px_var(--suelo),inset_0_0_0_4px_var(--color-rosa)]"
        >
          {levelProgress.level}
        </span>
        <div className="min-w-0">
          <p className="break-words font-titulo text-xl leading-tight text-letra-acento">{displayName}</p>
          <p className={ROTULO}>
            {levelProgress.xp} XP {t("total")}
          </p>
        </div>
      </div>

      {/* XP Progress Bar */}
      {!levelProgress.isMaxLevel && levelProgress.xpForNextLevel && (
        <div className="space-y-2">
          <Barra valor={levelProgress.progress} etiqueta={`${t("level")} ${levelProgress.level}: ${levelProgress.progress}%`} acento />
          <p className="flex flex-wrap justify-between gap-x-4 font-dato text-[0.6875rem] tabular-nums text-letra-suave">
            <span>
              {xpInCurrentLevel} / {xpNeededForNext} XP
            </span>
            <span>
              {t("nextLevel")}: {nextLevelName}
            </span>
          </p>
        </div>
      )}

      {/* Max level reached */}
      {levelProgress.isMaxLevel && <p className="font-lectura text-letra-acento">{t("maxLevel")}</p>}
    </div>
  );
}
