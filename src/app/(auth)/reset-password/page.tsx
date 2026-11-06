"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Input, buttonClasses } from "@/components/ui";
import { AvisoError, CamposEsqueleto, ENLACE_PLIEGO, Pliego } from "../pliego";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t("errors.weakPassword"));
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("errors.generic"));
        return;
      }

      setIsSuccess(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Pliego
        grabado="The Star"
        tituloId="reset-titulo"
        etiqueta={t("sheetRecover")}
        titulo={t("invalidLinkTitle")}
        bajada={t("invalidLinkSubtitle")}
      >
        <Link href="/forgot-password" className={buttonClasses({ size: "lg", className: "w-full" })}>
          {t("requestNewLink")}
        </Link>
      </Pliego>
    );
  }

  if (isSuccess) {
    return (
      <Pliego
        grabado="The Star"
        tituloId="reset-titulo"
        etiqueta={t("sheetRecover")}
        titulo={t("passwordResetSuccess")}
        bajada={t("passwordResetSuccessSubtitle")}
      >
        <Link href="/login" className={buttonClasses({ size: "lg", className: "w-full" })}>
          {t("loginButton")}
        </Link>
      </Pliego>
    );
  }

  return (
    <Pliego
      grabado="The Star"
      tituloId="reset-titulo"
      etiqueta={t("sheetRecover")}
      titulo={t("resetPasswordTitle")}
      bajada={t("resetPasswordSubtitle")}
    >
      {error && <AvisoError>{error}</AvisoError>}

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Input
          id="reset-password"
          label={t("newPassword")}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          id="reset-confirm"
          label={t("confirmNewPassword")}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          {t("resetPassword")}
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

function ResetPasswordSkeleton() {
  const t = useTranslations("auth");
  return (
    <Pliego
      grabado="The Star"
      tituloId="reset-titulo"
      etiqueta={t("sheetRecover")}
      titulo={t("resetPasswordTitle")}
    >
      <CamposEsqueleto campos={2} />
    </Pliego>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
