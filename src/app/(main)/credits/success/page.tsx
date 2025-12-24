"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent } from "@/components/ui";

interface SessionData {
  status: string;
  paymentStatus: string;
  credits: number;
  amountTotal: number;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const t = useTranslations("credits");

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError(t("error.sessionNotFound"));
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/stripe/session/${sessionId}`);
        if (!res.ok) throw new Error(t("error.sessionError"));
        const data = await res.json();
        setSessionData(data);
      } catch (err) {
        console.error(err);
        setError(t("error.verifyError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, t]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto" />
          <div className="h-6 bg-slate-800 rounded w-2/3 mx-auto" />
          <div className="h-4 bg-slate-800 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <Card>
          <CardContent className="p-8">
            <div className="text-5xl mb-4">&#10060;</div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              {t("error.title")}
            </h1>
            <p className="text-slate-400 mb-6">
              {error || t("error.subtitle")}
            </p>
            <Link href="/credits">
              <Button>{t("error.retry")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      {/* Confetti Animation */}
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span
                style={{
                  color: ["#a855f7", "#f59e0b", "#22c55e", "#3b82f6"][
                    Math.floor(Math.random() * 4)
                  ],
                  fontSize: `${12 + Math.random() * 12}px`,
                }}
              >
                &#10022;
              </span>
            </div>
          ))}
        </div>

        <Card variant="highlighted" className="relative z-10">
          <CardContent className="p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-slate-100 mb-2">
              &#127881; {t("success.title")}
            </h1>

            <p className="text-slate-400 mb-6">
              {t("success.subtitle")}
            </p>

            {/* Credits Added */}
            <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
              <p className="text-slate-400 text-sm mb-1">{t("success.creditsAdded")}</p>
              <p className="text-5xl font-bold text-amber-400">
                +{sessionData.credits}
              </p>
            </div>

            {/* Amount Paid */}
            <p className="text-slate-500 text-sm mb-8">
              {t("success.amountPaid")}: ${((sessionData.amountTotal || 0) / 100).toFixed(2)} USD
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/reading/new">
                <Button size="lg">{t("success.startReading")}</Button>
              </Link>
              <Link href="/credits">
                <Button variant="secondary" size="lg">
                  {t("success.viewCredits")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto py-20 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto" />
            <div className="h-6 bg-slate-800 rounded w-2/3 mx-auto" />
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
