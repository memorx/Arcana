"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { CREDIT_PACKAGES, CreditPackage } from "@/lib/pricing";

export default function CreditsPage() {
  const t = useTranslations("credits");
  const tDashboard = useTranslations("dashboard");
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [freeReadings, setFreeReadings] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user/credits");
        if (res.ok) {
          const data = await res.json();
          setUserCredits(data.credits);
          setFreeReadings(data.freeReadingsLeft);
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasingId(pkg.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Error");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Error. Try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          {t("title")}
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* Current Balance */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">{t("currentBalance")}</p>
              <div className="flex items-center gap-4 mt-2">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-800 animate-pulse rounded" />
                ) : (
                  <>
                    <span className="text-3xl font-bold text-slate-100">
                      {userCredits} {t("creditsUnit")}
                    </span>
                    {freeReadings !== null && freeReadings > 0 && (
                      <Badge variant="success">
                        +{tDashboard("freeReadings", { count: freeReadings })}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="text-5xl text-amber-400/50">&#10022;</div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Cost Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-amber-400 font-semibold">{t("spreadCosts.threeCard")}</p>
          <p className="text-slate-400 text-sm">1 {t("creditsUnit").toLowerCase()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-amber-400 font-semibold">{t("spreadCosts.simpleCross")}</p>
          <p className="text-slate-400 text-sm">2 {t("creditsUnit").toLowerCase()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-amber-400 font-semibold">{t("spreadCosts.horseshoe")}</p>
          <p className="text-slate-400 text-sm">2 {t("creditsUnit").toLowerCase()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-amber-400 font-semibold">{t("spreadCosts.celticCross")}</p>
          <p className="text-slate-400 text-sm">3 {t("creditsUnit").toLowerCase()}</p>
        </div>
      </div>

      {/* Credit Packages */}
      <div className="grid md:grid-cols-3 gap-6 items-center">
        {CREDIT_PACKAGES.map((pkg) => (
          <Card
            key={pkg.id}
            variant={pkg.popular ? "highlighted" : "default"}
            className={`relative transition-all duration-300 ${
              pkg.popular
                ? "ring-2 ring-purple-500 md:scale-105 md:-my-4 shadow-xl shadow-purple-500/20"
                : "hover:ring-1 hover:ring-slate-700"
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-purple-600 to-amber-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                  {t("popular")}
                </span>
              </div>
            )}
            <CardHeader className={`text-center ${pkg.popular ? "pt-8" : ""} pb-2`}>
              <CardTitle className={`font-bold text-slate-100 ${pkg.popular ? "text-5xl" : "text-4xl"}`}>
                {pkg.credits}
              </CardTitle>
              <p className="text-slate-400 text-sm">{t("creditsUnit")}</p>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <p className={`font-bold text-amber-400 ${pkg.popular ? "text-4xl" : "text-3xl"}`}>
                  {pkg.priceDisplay}
                </p>
                <p className="text-slate-500 text-sm">{pkg.description}</p>
              </div>

              <Button
                onClick={() => handlePurchase(pkg)}
                disabled={purchasingId !== null}
                isLoading={purchasingId === pkg.id}
                className={`w-full ${pkg.popular ? "shadow-lg shadow-amber-500/25" : ""}`}
                size={pkg.popular ? "lg" : "md"}
                variant={pkg.popular ? "primary" : "secondary"}
              >
                {t("buy")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Note */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          {t("securePayment")}
        </p>
      </div>
    </div>
  );
}
