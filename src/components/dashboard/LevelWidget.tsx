import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, Button } from "@/components/ui";
import { getUserLevelProgress } from "@/lib/xp";
import { LEVELS } from "@/lib/levels";

interface LevelWidgetProps {
  userId: string;
}

// Level-specific gradient colors
const LEVEL_COLORS: Record<number, { from: string; to: string; border: string }> = {
  1: { from: "from-slate-500", to: "to-slate-600", border: "border-slate-500/30" },
  2: { from: "from-blue-500", to: "to-cyan-500", border: "border-blue-500/30" },
  3: { from: "from-purple-500", to: "to-pink-500", border: "border-purple-500/30" },
  4: { from: "from-amber-500", to: "to-orange-500", border: "border-amber-500/30" },
  5: { from: "from-yellow-400", to: "to-amber-300", border: "border-yellow-400/30" },
};

export async function LevelWidget({ userId }: LevelWidgetProps) {
  const t = await getTranslations("levels");
  const locale = await getLocale();

  const levelProgress = await getUserLevelProgress(userId);
  const displayName = locale === "en" ? levelProgress.levelName : levelProgress.levelNameEs;
  const colors = LEVEL_COLORS[levelProgress.level] || LEVEL_COLORS[1];

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
    <Card className={`bg-gradient-to-r ${colors.from}/10 ${colors.to}/10 ${colors.border}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Level icon with gradient background */}
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center text-2xl shadow-lg`}
            >
              {levelProgress.levelIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100">
                  {t("level")} {levelProgress.level}
                </h3>
                <span className={`text-sm bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent font-medium`}>
                  {displayName}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {levelProgress.xp} XP {t("total")}
              </p>
            </div>
          </div>
          <Link href="/progress">
            <Button variant="secondary" size="sm">{t("viewProgress")}</Button>
          </Link>
        </div>

        {/* XP Progress Bar */}
        {!levelProgress.isMaxLevel && levelProgress.xpForNextLevel && (
          <>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full bg-gradient-to-r ${colors.from} ${colors.to} transition-all duration-500`}
                style={{ width: `${levelProgress.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                {xpInCurrentLevel} / {xpNeededForNext} XP
              </span>
              <span>
                {t("nextLevel")}: {nextLevelName}
              </span>
            </div>
          </>
        )}

        {/* Max level reached */}
        {levelProgress.isMaxLevel && (
          <div className={`text-center py-2 bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent font-medium`}>
            {t("maxLevel")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
