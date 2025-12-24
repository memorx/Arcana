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

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/history");
  }

  const t = await getTranslations("history");
  const locale = await getLocale();

  const readings = await prisma.reading.findMany({
    where: { userId: session.user.id },
    include: { spreadType: true },
    orderBy: { createdAt: "desc" },
  });

  // Group readings by month
  const groupedReadings = readings.reduce(
    (acc, reading) => {
      const date = new Date(reading.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
        month: "long",
        year: "numeric",
      });

      if (!acc[key]) {
        acc[key] = { label, readings: [] };
      }
      acc[key].readings.push(reading);
      return acc;
    },
    {} as Record<
      string,
      { label: string; readings: typeof readings }
    >
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            {t("title")}
          </h1>
          <p className="text-slate-400 mt-1">
            {readings.length} {readings.length === 1
              ? (locale === "en" ? "reading total" : "lectura en total")
              : (locale === "en" ? "readings total" : "lecturas en total")}
          </p>
        </div>
        <Link href="/reading/new">
          <Button>{t("newReading")}</Button>
        </Link>
      </div>

      {/* Readings List */}
      {readings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl text-slate-700 mb-4">&#9788;</div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">
              {t("emptyTitle")}
            </h2>
            <p className="text-slate-400 mb-6">
              {t("emptySubtitle")}
            </p>
            <Link href="/reading/new">
              <Button>{t("startReading")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedReadings).map(([key, group]) => (
            <section key={key}>
              <h2 className="text-lg font-medium text-slate-400 mb-4 capitalize">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.readings.map((reading) => {
                  const cards = reading.cards as Array<{
                    position: number;
                    cardId: string;
                    isReversed: boolean;
                  }>;

                  const spreadName = locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs;

                  return (
                    <Link key={reading.id} href={`/reading/${reading.id}`}>
                      <Card variant="interactive">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Card stack icon */}
                            <div className="hidden sm:flex items-end gap-0.5 pt-1">
                              {Array.from({
                                length: Math.min(cards.length, 4),
                              }).map((_, i) => (
                                <div
                                  key={i}
                                  className="w-4 h-6 bg-gradient-to-b from-purple-800/50 to-purple-900/50 rounded-sm border border-purple-500/30"
                                  style={{
                                    transform: `rotate(${(i - 1.5) * 5}deg)`,
                                    marginLeft: i > 0 ? "-6px" : "0",
                                  }}
                                />
                              ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="primary">
                                  {spreadName}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {new Date(
                                    reading.createdAt
                                  ).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-300 line-clamp-2">
                                {reading.intention}
                              </p>
                            </div>

                            {/* Arrow */}
                            <div className="text-slate-500 self-center">
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
