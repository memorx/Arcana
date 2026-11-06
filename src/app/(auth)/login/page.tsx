"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";
import { AvisoError, CamposEsqueleto, ENLACE_PLIEGO, IconoGoogle, Pliego, Separador } from "../pliego";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError(t("errors.invalidCredentials"));
        setIsLoading(false);
      } else {
        // Keep loading state while navigating to dashboard
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFormError(t("errors.invalidCredentials"));
      setIsLoading(false);
    }
  };

  return (
    <>
      {(error || formError) && <AvisoError>{formError || t("errors.invalidCredentials")}</AvisoError>}

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Input
          id="login-email"
          label={t("email")}
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="grid gap-1">
          <Input
            id="login-password"
            label={t("password")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Link href="/forgot-password" className={`${ENLACE_PLIEGO} justify-self-end text-[0.9375rem]`}>
            {t("forgotPassword")}
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          {t("loginButton")}
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
            onClick={() => signIn("google", { callbackUrl })}
          >
            <IconoGoogle />
            {t("continueWithGoogle")}
          </Button>
        </>
      )}

      <p className="mt-8 border-t border-tinta/15 pt-5 text-center text-grafito">
        {t("noAccount")}{" "}
        <Link href="/register" className={ENLACE_PLIEGO}>
          {t("registerButton")}
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");

  return (
    <Pliego
      grabado="The Magician"
      tituloId="login-titulo"
      etiqueta={t("sheetLogin")}
      titulo={t("loginTitle")}
      bajada={t("loginSubtitle")}
    >
      <Suspense fallback={<CamposEsqueleto campos={2} />}>
        <LoginForm />
      </Suspense>
    </Pliego>
  );
}
