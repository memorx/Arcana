"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { Card, CardContent, Button, Badge } from "@/components/ui";

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralCredits: number;
}

export default function ReferralPage() {
  const { data: session, status } = useSession();
  const t = useTranslations("referral");
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/referral")
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const referralLink = data?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${data.referralCode}`
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      t("shareText", { link: referralLink })
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(t("twitterText"));
    const url = encodeURIComponent(referralLink);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank"
    );
  };

  if (status === "unauthenticated") {
    return (
      <>
        <Header />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-slate-100 mb-4">
              {t("loginRequired")}
            </h1>
            <p className="text-slate-400">{t("loginRequiredDesc")}</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="text-6xl mb-4">&#127873;</div>
              <h1 className="text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                  {t("title")}
                </span>
              </h1>
              <p className="text-slate-400 text-lg">{t("subtitle")}</p>
            </div>

            {/* How it works */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">
                  {t("howItWorks")}
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <p className="text-slate-300">{t("step1")}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <p className="text-slate-300">{t("step2")}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      &#10003;
                    </div>
                    <p className="text-slate-300">{t("step3")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            {!loading && data && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {data.referralCount}
                    </div>
                    <p className="text-slate-400 text-sm">{t("friendsReferred")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-amber-400">
                      {data.referralCredits}
                    </div>
                    <p className="text-slate-400 text-sm">{t("creditsEarned")}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Share section */}
            <Card variant="highlighted">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">
                  {t("yourLink")}
                </h2>

                {loading ? (
                  <div className="h-12 bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <>
                    {/* Link display */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex-1 p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-sm truncate">
                        {referralLink}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={copyToClipboard}
                        className="flex-shrink-0"
                      >
                        {copied ? t("copied") : t("copy")}
                      </Button>
                    </div>

                    {/* Share buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={shareOnWhatsApp}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <span>&#128172;</span>
                        WhatsApp
                      </Button>
                      <Button
                        onClick={shareOnTwitter}
                        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600"
                      >
                        <span>&#128038;</span>
                        Twitter
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Limit note */}
            <p className="text-center text-sm text-slate-500 mt-6">
              {t("limit")}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
