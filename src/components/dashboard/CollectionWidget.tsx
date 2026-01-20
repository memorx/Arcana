import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, Button } from "@/components/ui";
import { getCollectionStats, getRecentlyDiscovered } from "@/lib/collection";

interface CollectionWidgetProps {
  userId: string;
}

export async function CollectionWidget({ userId }: CollectionWidgetProps) {
  const t = await getTranslations("collection");
  const locale = await getLocale();

  const [stats, recentCards] = await Promise.all([
    getCollectionStats(userId),
    getRecentlyDiscovered(userId, 3),
  ]);

  const getCardName = (card: { name: string; nameEs: string }) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  return (
    <Card className="bg-gradient-to-r from-purple-900/20 to-amber-900/20 border-purple-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#127183;</span>
            <div>
              <h3 className="font-medium text-slate-100">{t("title")}</h3>
              <p className="text-sm text-slate-400">
                {stats.discovered}/{stats.total} ({stats.percentage}%)
              </p>
            </div>
          </div>
          <Link href="/collection">
            <Button variant="secondary" size="sm">{t("viewAll")}</Button>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-amber-500 transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>

        {/* Recently Discovered */}
        {recentCards.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">{t("recentlyDiscovered")}</p>
            <div className="flex gap-2">
              {recentCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="relative w-12 h-18 rounded overflow-hidden ring-1 ring-amber-500/50 hover:ring-amber-400 transition-all"
                >
                  <Image
                    src={card.imageUrl}
                    alt={getCardName(card)}
                    width={48}
                    height={72}
                    className="object-cover"
                    unoptimized
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        {recentCards.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">
            {t("noCardsYet")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
