import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@/components/ui";

export default async function NewReadingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/reading/new");
  }

  const t = await getTranslations("reading");
  const locale = await getLocale();

  const [user, spreadTypes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { freeReadingsLeft: true, credits: true },
    }),
    prisma.spreadType.findMany({
      orderBy: { cardCount: "asc" },
    }),
  ]);

  const freeReadingsLeft = user?.freeReadingsLeft || 0;
  const credits = user?.credits || 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          {t("selectSpread")}
        </h1>
        <p className="text-slate-400">
          {t("selectSpreadSubtitle")}
        </p>

        {/* User balance */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {freeReadingsLeft > 0 && (
            <Badge variant="success" className="text-sm px-3 py-1">
              {freeReadingsLeft} {freeReadingsLeft !== 1
                ? (locale === "en" ? "free readings" : "lecturas gratis")
                : (locale === "en" ? "free reading" : "lectura gratis")}
            </Badge>
          )}
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {credits} {locale === "en" ? "credits available" : "creditos disponibles"}
          </Badge>
        </div>
      </div>

      {/* Spread Types Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {spreadTypes.map((spread) => {
          const canAfford =
            freeReadingsLeft > 0 || credits >= spread.creditCost;
          const positions = spread.positions as Array<{
            position: number;
            name: string;
            nameEs: string;
            description: string;
          }>;

          const spreadName = locale === "en" ? spread.name : spread.nameEs;
          const spreadDescription = locale === "en" ? spread.description : spread.descriptionEs;

          return (
            <Link
              key={spread.id}
              href={canAfford ? `/reading/new/${spread.id}` : "#"}
              className={!canAfford ? "cursor-not-allowed" : ""}
            >
              <Card
                variant={canAfford ? "interactive" : "default"}
                className={`h-full ${
                  !canAfford ? "opacity-50" : ""
                } relative overflow-hidden`}
              >
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {spreadName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {t("cards", { count: spread.cardCount })}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={freeReadingsLeft > 0 ? "success" : "secondary"}
                      className="text-sm"
                    >
                      {freeReadingsLeft > 0
                        ? t("free")
                        : spread.creditCost !== 1 ? t("costPlural", { count: spread.creditCost }) : t("cost", { count: spread.creditCost })}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">
                    {spreadDescription}
                  </p>

                  {/* Position preview */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      {t("positions")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {positions.slice(0, 5).map((pos) => (
                        <span
                          key={pos.position}
                          className="text-xs bg-slate-800/50 text-slate-400 px-2 py-1 rounded"
                        >
                          {locale === "en" ? pos.name : pos.nameEs}
                        </span>
                      ))}
                      {positions.length > 5 && (
                        <span className="text-xs text-slate-500">
                          {t("more", { count: positions.length - 5 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual representation */}
                  <div className="flex justify-center gap-1 mt-6">
                    {Array.from({ length: spread.cardCount }).map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-8 bg-gradient-to-b from-purple-800/40 to-purple-900/40 rounded-sm border border-purple-500/20"
                        style={{
                          transform: `rotate(${(i - spread.cardCount / 2) * 3}deg)`,
                        }}
                      />
                    ))}
                  </div>

                  {!canAfford && (
                    <p className="text-center text-amber-400/70 text-sm mt-4">
                      {t("needMoreCredits", { count: spread.creditCost - credits })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Buy credits CTA */}
      {freeReadingsLeft === 0 && credits < 3 && (
        <Card variant="highlighted" className="mt-8 text-center p-6">
          <p className="text-slate-300 mb-4">
            {t("buyCreditsQuestion")}
          </p>
          <Link href="/credits">
            <span className="text-amber-400 hover:text-amber-300 font-medium">
              {t("buyCreditsLink")} →
            </span>
          </Link>
        </Card>
      )}
    </div>
  );
}
