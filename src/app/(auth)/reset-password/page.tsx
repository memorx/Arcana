"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

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
        setError(data.error || "Something went wrong");
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">&#9888;</div>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <p className="text-slate-400 text-sm mt-2">
            This password reset link is invalid or has expired.
          </p>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button className="w-full">Request new link</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">&#10004;</div>
          <CardTitle className="text-2xl">{t("passwordResetSuccess")}</CardTitle>
          <p className="text-slate-400 text-sm mt-2">
            {t("passwordResetSuccessSubtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">{t("loginButton")}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">&#128274;</div>
        <CardTitle className="text-2xl">{t("resetPasswordTitle")}</CardTitle>
        <p className="text-slate-400 text-sm mt-2">
          {t("resetPasswordSubtitle")}
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
            label={t("newPassword")}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label={t("confirmNewPassword")}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            {t("resetPassword")}
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

function ResetPasswordSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">&#128274;</div>
        <CardTitle className="text-2xl">...</CardTitle>
        <p className="text-slate-400 text-sm mt-2">...</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-slate-800 rounded-lg" />
          <div className="h-10 bg-slate-800 rounded-lg" />
          <div className="h-12 bg-slate-800 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
