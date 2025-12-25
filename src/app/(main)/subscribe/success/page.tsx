"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, Badge } from "@/components/ui";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const t = useTranslations("subscribe");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError(t("success.noSession"));
      setIsLoading(false);
      return;
    }

    // Just verify the session exists - webhook handles the actual subscription creation
    const verifySession = async () => {
      try {
        const res = await fetch(`/api/stripe/session/${sessionId}`);
        if (!res.ok) {
          throw new Error(t("success.sessionNotFound"));
        }
      } catch {
        setError(t("success.verifyError"));
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [sessionId, t]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto" />
          <div className="h-8 bg-slate-800 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-slate-800 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardContent className="p-8">
            <div className="text-5xl mb-4">&#9888;</div>
            <p className="text-red-400 mb-4">{error}</p>
            <Link href="/subscribe">
              <Button variant="secondary">{t("success.tryAgain")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <Card variant="highlighted">
        <CardContent className="p-8">
          <div className="text-6xl mb-4">&#9788;</div>
          <Badge variant="success" className="mb-4">
            {t("success.active")}
          </Badge>

          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            {t("success.title")}
          </h1>
          <p className="text-slate-400 mb-6">{t("success.subtitle")}</p>

          <div className="p-4 bg-slate-800/50 rounded-lg mb-6">
            <p className="text-sm text-slate-300">{t("success.nextSteps")}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/daily">
              <Button className="w-full" size="lg">
                {t("success.goToDaily")}
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" className="w-full">
                {t("success.goToDashboard")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SuccessSkeleton() {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="animate-pulse space-y-4">
        <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto" />
        <div className="h-8 bg-slate-800 rounded w-3/4 mx-auto" />
      </div>
    </div>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <SuccessContent />
    </Suspense>
  );
}
