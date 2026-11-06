"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";
import { AvisoError, CamposEsqueleto, ENLACE_PLIEGO, IconoGoogle, Pliego, Separador } from "../pliego";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, referralCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errors.createAccount"));
        setIsLoading(false);
        return;
      }

      // Auto login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("errors.loginAfterRegister"));
        setIsLoading(false);
      } else {
        // Keep loading state while navigating to dashboard
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(t("errors.createAccount"));
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && <AvisoError>{error}</AvisoError>}

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Input
          id="register-name"
          label={t("nameOptional")}
          type="text"
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          id="register-email"
          label={t("email")}
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="register-password"
          label={t("password")}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          id="register-confirm"
          label={t("confirmPassword")}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          {t("registerButton")}
        </Button>
      </form>

      {/* Google OAuth - only show if enabled */}
      {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
        <>
          <Separador>{t("orContinueWith")}</Separador>
          <Button
            type="button"
            variant="linea"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <IconoGoogle />
            {t("continueWithGoogle")}
          </Button>
        </>
      )}

      <p className="mt-7 text-center text-[0.9375rem] leading-relaxed text-grafito">
        {t("termsText")}{" "}
        <Link href="/terms" className="text-rosa-texto underline decoration-rosa-texto/40 underline-offset-4 hover:decoration-rosa-texto">
          {t("termsLink")}
        </Link>{" "}
        {t("andText")}{" "}
        <Link href="/privacy" className="text-rosa-texto underline decoration-rosa-texto/40 underline-offset-4 hover:decoration-rosa-texto">
          {t("privacyLink")}
        </Link>
      </p>

      <p className="mt-6 border-t border-tinta/15 pt-5 text-center text-grafito">
        {t("hasAccount")}{" "}
        <Link href="/login" className={`${ENLACE_PLIEGO} font-medium`}>
          {t("loginButton")}
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  const t = useTranslations("auth");

  return (
    <Pliego
      grabado="The Fool"
      tituloId="register-titulo"
      etiqueta={t("sheetRegister")}
      titulo={t("registerTitle")}
      bajada={t("registerSubtitle")}
    >
      <Suspense fallback={<CamposEsqueleto campos={4} />}>
        <RegisterForm />
      </Suspense>
    </Pliego>
  );
}
