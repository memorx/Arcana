"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Input, buttonClasses } from "@/components/ui";
import { AvisoError, ENLACE_PLIEGO, Pliego } from "../pliego";

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
        setError(data.error || t("errors.generic"));
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Pliego
        grabado="The Hermit"
        tituloId="forgot-titulo"
        etiqueta={t("sheetRecover")}
        titulo={t("resetLinkSent")}
        bajada={t("resetLinkSentSubtitle")}
      >
        <Link href="/login" className={buttonClasses({ variant: "linea", size: "lg", className: "w-full" })}>
          {t("backToLogin")}
        </Link>
      </Pliego>
    );
  }

  return (
    <Pliego
      grabado="The Hermit"
      tituloId="forgot-titulo"
      etiqueta={t("sheetRecover")}
      titulo={t("forgotPasswordTitle")}
      bajada={t("forgotPasswordSubtitle")}
    >
      {error && <AvisoError>{error}</AvisoError>}

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Input
          id="forgot-email"
          label={t("email")}
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          {t("sendResetLink")}
        </Button>
      </form>

      <p className="mt-8 border-t border-tinta/15 pt-5 text-center">
        <Link href="/login" className={`${ENLACE_PLIEGO} font-medium`}>
          {t("backToLogin")}
        </Link>
      </p>
    </Pliego>
  );
}
