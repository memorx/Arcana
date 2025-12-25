"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  TarotCardStatic,
} from "@/components/ui";

interface DailyReading {
  id: string;
  date: string;
  cardId: string;
  isReversed: boolean;
  interpretation: string;
  sentAt: string | null;
  card: {
    id: string;
    name: string;
    nameEs: string;
    arcana: string;
    suit: string | null;
    imageUrl: string;
  };
}

interface Subscription {
  status: string;
  freeReadingsUsed: number;
  freeReadingsPerMonth: number;
  paymentMethod?: string;
}

export default function DailyPage() {
  const t = useTranslations("daily");
  const tSubscribe = useTranslations("subscribe");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [todayReading, setTodayReading] = useState<DailyReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<DailyReading[]>([]);
  const [emailTime, setEmailTime] = useState("08:00");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, dailyRes, profileRes] = await Promise.all([
          fetch("/api/subscription"),
          fetch("/api/daily-reading"),
          fetch("/api/profile"),
        ]);

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.subscription);
        }

        if (dailyRes.ok) {
          const dailyData = await dailyRes.json();
          setTodayReading(dailyData.today);
          setRecentReadings(dailyData.recent || []);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile?.emailTime) {
            setEmailTime(profileData.profile.emailTime);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCardName = (card: { name: string; nameEs: string }) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  const hasActiveSubscription = subscription?.status === "active";
  const isCreditsExhausted = subscription?.status === "credits_exhausted";

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-slate-800 rounded w-1/3 mx-auto" />
          <div className="h-96 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  // Credits exhausted - show resubscribe CTA
  if (isCreditsExhausted) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-6">&#128176;</div>
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          {t("creditsExhausted")}
        </h1>
        <p className="text-slate-400 mb-8">{t("creditsExhaustedDesc")}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/credits">
            <Button size="lg">{t("buyCredits")}</Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="secondary" size="lg">
              {t("resubscribe")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // No subscription - show CTA
  if (!hasActiveSubscription) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-6">&#9788;</div>
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          {t("noSubscription")}
        </h1>
        <p className="text-slate-400 mb-8">{t("noSubscriptionDesc")}</p>

        {/* Preview Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10" />
            <div className="p-8 filter blur-sm">
              <div className="w-32 h-48 mx-auto bg-gradient-to-br from-purple-800/50 to-purple-900/50 rounded-lg border border-purple-500/30" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {t("preview")}
              </Badge>
            </div>
          </div>
        </Card>

        <Link href="/subscribe">
          <Button size="lg">{t("subscribeNow")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100">{t("title")}</h1>
      </div>

      {/* Today's Card */}
      <Card variant="highlighted" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-400">&#9788;</span>
            {t("todayCard")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayReading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card Display */}
              <div className="flex justify-center">
                <TarotCardStatic
                  card={{
                    name: todayReading.card.name,
                    nameEs: todayReading.card.nameEs,
                    arcana: todayReading.card.arcana as "MAJOR" | "MINOR",
                    suit: todayReading.card.suit as
                      | "WANDS"
                      | "CUPS"
                      | "SWORDS"
                      | "PENTACLES"
                      | null,
                    number: parseInt(
                      todayReading.card.id.split("_").pop() || "0"
                    ),
                    imageUrl: todayReading.card.imageUrl,
                  }}
                  isReversed={todayReading.isReversed}
                  size="lg"
                  locale={locale}
                />
              </div>

              {/* Interpretation */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100 mb-1">
                    {getCardName(todayReading.card)}
                  </h3>
                  {todayReading.isReversed && (
                    <Badge variant="warning">{t("reversed")}</Badge>
                  )}
                </div>

                <div className="prose prose-invert prose-sm max-w-none">
                  {todayReading.interpretation
                    .split("\n")
                    .map((paragraph, i) => (
                      <p key={i} className="text-slate-300 mb-3">
                        {paragraph}
                      </p>
                    ))}
                </div>

                {todayReading.sentAt && (
                  <p className="text-xs text-slate-500">
                    {t("sentAt", {
                      time: new Date(todayReading.sentAt).toLocaleTimeString(
                        locale === "en" ? "en-US" : "es-ES",
                        { hour: "2-digit", minute: "2-digit" }
                      ),
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 opacity-50">&#10022;</div>
              <p className="text-slate-400 mb-2">{t("noCardYet")}</p>
              <p className="text-slate-500 text-sm">
                {t("cardWillArrive", { time: emailTime })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Cards History */}
      {recentReadings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("history")}</CardTitle>
            <p className="text-sm text-slate-400">{t("last7days")}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {recentReadings.map((reading) => (
                <div
                  key={reading.id}
                  className="text-center p-2 bg-slate-800/50 rounded-lg"
                >
                  <p className="text-xs text-slate-500 mb-2">
                    {new Date(reading.date).toLocaleDateString(
                      locale === "en" ? "en-US" : "es-ES",
                      { weekday: "short", day: "numeric" }
                    )}
                  </p>
                  <TarotCardStatic
                    card={{
                      name: reading.card.name,
                      nameEs: reading.card.nameEs,
                      arcana: reading.card.arcana as "MAJOR" | "MINOR",
                      suit: reading.card.suit as
                        | "WANDS"
                        | "CUPS"
                        | "SWORDS"
                        | "PENTACLES"
                        | null,
                      number: parseInt(reading.card.id.split("_").pop() || "0"),
                      imageUrl: reading.card.imageUrl,
                    }}
                    isReversed={reading.isReversed}
                    size="sm"
                    locale={locale}
                  />
                  {reading.isReversed && (
                    <Badge variant="warning" className="mt-1 text-xs">
                      R
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
