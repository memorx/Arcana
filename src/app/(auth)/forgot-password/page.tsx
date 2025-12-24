"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">&#9993;</div>
          <CardTitle className="text-2xl">{t("resetLinkSent")}</CardTitle>
          <p className="text-slate-400 text-sm mt-2">
            {t("resetLinkSentSubtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              {t("backToLogin")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">&#128274;</div>
        <CardTitle className="text-2xl">{t("forgotPasswordTitle")}</CardTitle>
        <p className="text-slate-400 text-sm mt-2">
          {t("forgotPasswordSubtitle")}
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("email")}
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            {t("sendResetLink")}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          <Link
            href="/login"
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
