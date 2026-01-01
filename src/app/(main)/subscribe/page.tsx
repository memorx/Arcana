"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { getZodiacEmoji, getZodiacSignEs } from "@/lib/zodiac";

interface UserProfile {
  fullName: string;
  zodiacSign: string;
  focusArea: string;
  emailTime: string;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: string;
}

export default function SubscribePage() {
  const router = useRouter();
  const t = useTranslations("subscribe");
  const tProfile = useTranslations("profile");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingCredits, setIsProcessingCredits] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userCredits, setUserCredits] = useState(0);

  const plan = SUBSCRIPTION_PLANS[0]; // Daily Oracle plan

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, subRes, creditsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/subscription"),
          fetch("/api/user/credits"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.profile);
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.subscription);
        }

        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          setUserCredits(creditsData.credits || 0);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async () => {
    if (!profile) {
      router.push("/profile/setup");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Error");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Error processing subscription. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribeWithCredits = async () => {
    if (!profile) {
      router.push("/profile/setup");
      return;
    }

    setIsProcessingCredits(true);
    try {
      const res = await fetch("/api/subscribe/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (res.ok) {
        // Keep loading state while navigating
        router.push("/subscribe/success?method=credits");
      } else {
        throw new Error(data.error || "Error");
      }
    } catch (error) {
      console.error("Credits subscription error:", error);
      alert(
        locale === "en"
          ? "Error processing subscription. Please try again."
          : "Error procesando suscripcion. Intenta de nuevo."
      );
      setIsProcessingCredits(false);
    }
  };

  const features = locale === "en" ? plan.features : plan.featuresEs;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-slate-800 rounded w-1/2 mx-auto" />
          <div className="h-6 bg-slate-800 rounded w-2/3 mx-auto" />
          <div className="h-96 bg-slate-800 rounded mt-8" />
        </div>
      </div>
    );
  }

  // Already subscribed view
  if (subscription && subscription.status === "active") {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-6">&#9788;</div>
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          {t("alreadySubscribed")}
        </h1>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Badge variant="success">Active</Badge>
              {subscription.cancelAtPeriodEnd && (
                <Badge variant="warning">Cancels at period end</Badge>
              )}
            </div>

            {subscription.currentPeriodEnd && (
              <p className="text-slate-400">
                {t("activeUntil", {
                  date: new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    locale === "en" ? "en-US" : "es-ES",
                    { day: "numeric", month: "long", year: "numeric" }
                  ),
                })}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/daily">
            <Button size="lg">{t("success.goToDaily")}</Button>
          </Link>
          <Link href="/api/stripe/portal">
            <Button variant="secondary" size="lg">
              {t("manageSubscription")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-6">&#9788;</div>
        <h1 className="text-4xl font-bold text-slate-100 mb-4">{t("title")}</h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Features Card */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-2xl">
              {locale === "en" ? plan.name : plan.nameEs}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-400">{t("description")}</p>

            <ul className="space-y-3">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-amber-400 mt-0.5">&#10003;</span>
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-slate-800">
              <div className="text-center">
                <span className="text-4xl font-bold text-amber-400">
                  {plan.priceDisplay}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile/Subscribe Card */}
        <Card variant="highlighted" className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-amber-400">&#10022;</span>
              {profile ? t("cta") : t("setupFirst")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile ? (
              <>
                {/* Profile Summary */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getZodiacEmoji(profile.zodiacSign)}
                    </span>
                    <div>
                      <p className="font-medium text-slate-100">
                        {profile.fullName}
                      </p>
                      <p className="text-sm text-slate-400">
                        {locale === "en"
                          ? profile.zodiacSign
                          : getZodiacSignEs(profile.zodiacSign)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {tProfile(`focusAreas.${profile.focusArea}`)}
                    </Badge>
                    <Badge variant="secondary">{profile.emailTime}</Badge>
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  className="w-full"
                  size="lg"
                  isLoading={isProcessing}
                >
                  {t("cta")}
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-slate-500">
                      {t("orPayWithCredits")}
                    </span>
                  </div>
                </div>

                {/* Credits option */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-300">{t("payWithCredits")}</span>
                    <Badge variant="secondary">
                      {plan.creditsCost} {t("creditsPerMonth")}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleSubscribeWithCredits}
                    variant="secondary"
                    className="w-full"
                    isLoading={isProcessingCredits}
                    disabled={!profile || userCredits < plan.creditsCost}
                  >
                    {userCredits < plan.creditsCost
                      ? t("needMoreCredits", { count: plan.creditsCost - userCredits })
                      : t("subscribeWithCredits")}
                  </Button>
                  {userCredits < plan.creditsCost && (
                    <Link
                      href="/credits"
                      className="block text-center text-sm text-purple-400 hover:text-purple-300 mt-2"
                    >
                      {t("buyCredits")}
                    </Link>
                  )}
                  <p className="text-xs text-slate-500 text-center mt-2">
                    {t("renewsAutomatically")}
                  </p>
                </div>

                <Link
                  href="/profile/setup"
                  className="block text-center text-sm text-purple-400 hover:text-purple-300"
                >
                  Edit profile
                </Link>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-center">{t("setupFirst")}</p>
                <Link href="/profile/setup">
                  <Button className="w-full" size="lg">
                    {tProfile("title")}
                  </Button>
                </Link>
              </>
            )}

            <p className="text-xs text-slate-500 text-center">
              Secure payments processed by Stripe
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
