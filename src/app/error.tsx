"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <div className="text-center px-4">
        <div className="text-8xl mb-6">&#9888;</div>
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          {t("errorPage.title")}
        </h1>
        <p className="text-slate-400 mb-8">{t("errorPage.message")}</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => reset()}>{t("errorPage.tryAgain")}</Button>
          <Link href="/">
            <Button variant="secondary">{t("errorPage.goHome")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
