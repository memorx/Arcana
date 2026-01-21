import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  CardContent,
  Badge,
} from "@/components/ui";
import { StreakDisplay } from "@/components/dashboard/StreakDisplay";
import { CollectionWidget } from "@/components/dashboard/CollectionWidget";
import { AchievementsWidget } from "@/components/dashboard/AchievementsWidget";
import { LevelWidget } from "@/components/dashboard/LevelWidget";
import { ChallengesWidget } from "@/components/dashboard/ChallengesWidget";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  // Fetch user data and recent readings
  const [user, recentReadings, spreadTypes, userProfile, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        freeReadingsLeft: true,
        credits: true,
        name: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    prisma.reading.findMany({
      where: { userId: session.user.id },
      include: { spreadType: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.spreadType.findMany({
      orderBy: { cardCount: "asc" },
    }),
    prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    }),
  ]);

  const isSubscribed = subscription?.status === "active";

  const totalReadings = await prisma.reading.count({
    where: { userId: session.user.id },
  });

  const displayName = user?.name || session.user.email?.split("@")[0] || "";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            {t("welcome", { name: displayName })}
          </h1>
          <p className="text-slate-400 mt-1">
            {t("welcomeSubtitle")}
          </p>
        </div>
        <Link href="/reading/new" prefetch={true}>
          <Button size="lg">{t("startReading")}</Button>
        </Link>
      </div>

      {/* Streak Display */}
      {(user?.currentStreak || 0) > 0 && (
        <StreakDisplay
          currentStreak={user?.currentStreak || 0}
          longestStreak={user?.longestStreak || 0}
        />
      )}

      {/* Level Widget */}
      <LevelWidget userId={session.user.id} />

      {/* Collection Widget */}
      <CollectionWidget userId={session.user.id} />

      {/* Achievements Widget */}
      <AchievementsWidget userId={session.user.id} />

      {/* Challenges Widget */}
      <ChallengesWidget userId={session.user.id} />

      {/* Complete Profile Prompt */}
      {!userProfile && (
        <Card className="border-amber-500/30 bg-amber-900/10">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">&#128100;</span>
              <div>
                <p className="font-medium text-slate-100">{t("completeProfile")}</p>
                <p className="text-sm text-slate-400">{t("completeProfileDesc")}</p>
              </div>
            </div>
            <Link href="/profile/setup">
              <Button size="sm">{t("setupProfile")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{t("freeReadingsLabel")}</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {user?.freeReadingsLeft || 0}
                </p>
              </div>
              <div className="text-4xl text-emerald-400/30">&#10022;</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{t("creditsLabel")}</p>
                <p className="text-3xl font-bold text-amber-400">
                  {user?.credits || 0}
                </p>
              </div>
              <div className="text-4xl text-amber-400/30">&#9733;</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{t("totalReadingsLabel")}</p>
                <p className="text-3xl font-bold text-purple-400">
                  {totalReadings}
                </p>
              </div>
              <div className="text-4xl text-purple-400/30">&#9788;</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Oracle Promo */}
      <Card className={`bg-gradient-to-r ${isSubscribed ? "from-emerald-900/30 to-teal-900/30 border-emerald-500/20" : "from-purple-900/30 to-amber-900/30 border-purple-500/20"}`}>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{isSubscribed ? "☀️" : "✨"}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-100">{t("dailyOracleTitle")}</h2>
                {isSubscribed && (
                  <Badge variant="success" className="text-xs">
                    {tCommon("active")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400">{t("dailyOracleDesc")}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/daily" prefetch={true}>
              <Button variant={isSubscribed ? "primary" : "secondary"} size="sm">
                {isSubscribed ? t("todayCardDone") : t("viewDaily")}
              </Button>
            </Link>
            {!isSubscribed && (
              <Link href="/subscribe" prefetch={true}>
                <Button size="sm">{t("subscribeCta")}</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referral Prompt */}
      <Card className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border-emerald-500/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#127873;</span>
            <div>
              <p className="font-medium text-slate-100">{t("referralTitle")}</p>
              <p className="text-sm text-slate-400">{t("referralDesc")}</p>
            </div>
          </div>
          <Link href="/referral">
            <Button variant="secondary" size="sm">{t("inviteFriends")}</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Quick Actions - Spread Types */}
      <section>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          {t("startNewReading")}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {spreadTypes.map((spread) => {
            const canAfford =
              (user?.freeReadingsLeft || 0) > 0 ||
              (user?.credits || 0) >= spread.creditCost;

            const spreadName = locale === "en" ? spread.name : spread.nameEs;
            const spreadDescription = locale === "en" ? spread.description : spread.descriptionEs;

            return (
              <Link key={spread.id} href={`/reading/new?spread=${spread.id}`}>
                <Card
                  variant="interactive"
                  className={!canAfford ? "opacity-50" : ""}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-1">
                        {Array.from({
                          length: Math.min(spread.cardCount, 5),
                        }).map((_, i) => (
                          <div
                            key={i}
                            className="w-4 h-6 bg-gradient-to-b from-purple-700/50 to-purple-900/50 rounded-sm border border-purple-500/30"
                          />
                        ))}
                        {spread.cardCount > 5 && (
                          <span className="text-xs text-slate-500">
                            +{spread.cardCount - 5}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={
                          (user?.freeReadingsLeft || 0) > 0
                            ? "success"
                            : "secondary"
                        }
                      >
                        {(user?.freeReadingsLeft || 0) > 0
                          ? t("free")
                          : `${spread.creditCost} cr`}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-slate-100">
                      {spreadName}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {spreadDescription}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Readings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-100">
            {t("recentReadings")}
          </h2>
          {totalReadings > 3 && (
            <Link href="/history">
              <Button variant="ghost" size="sm">
                {t("viewAll")}
              </Button>
            </Link>
          )}
        </div>

        {recentReadings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-5xl text-slate-700 mb-4">&#9788;</div>
              <p className="text-slate-400">
                {t("noReadings")}
              </p>
              <Link href="/reading/new" className="inline-block mt-4">
                <Button variant="secondary">{t("firstReading")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recentReadings.map((reading) => {
              const spreadName = locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs;

              return (
                <Link key={reading.id} href={`/reading/${reading.id}`}>
                  <Card variant="interactive">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="primary">
                              {spreadName}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {new Date(reading.createdAt).toLocaleDateString(
                                locale === "en" ? "en-US" : "es-ES",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                          <p className="text-slate-300 line-clamp-2">
                            {reading.intention}
                          </p>
                        </div>
                        <div className="text-slate-500">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
