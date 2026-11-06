"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, buttonClasses } from "@/components/ui";
import { AvisoError, Pliego } from "@/app/(auth)/pliego";

/** El pliego centrado en la columna de la app. */
function Centro({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-[clamp(8px,4vh,40px)]">{children}</div>;
}

function Confirmando() {
  const t = useTranslations("subscribe");
  return (
    <Centro>
      <div aria-busy="true" className="w-full max-w-[30rem]">
        <Pliego tituloId="subscribe-success-titulo" etiqueta={t("eyebrow")} titulo={t("success.verifying")}>
          <div aria-hidden="true" className="grid gap-4">
            <div className="h-16 bg-papel-hondo motion-safe:animate-pulse" />
            <div className="h-4 w-1/2 bg-papel-hondo motion-safe:animate-pulse" />
          </div>
        </Pliego>
      </div>
    </Centro>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  // Pagada con créditos (/api/subscribe/credits): no hay sesión de Stripe que verificar.
  const conCreditos = searchParams.get("method") === "credits";
  const t = useTranslations("subscribe");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (conCreditos) {
      // No hay sesión de Stripe que verificar: la bienvenida sólo si el servidor confirma la suscripción activa
      // (la misma fuente que /subscribe y /daily). Quien abre esta URL desde el historial sin estar suscrito ve el error.
      const verificarSuscripcion = async () => {
        try {
          const res = await fetch("/api/subscription");
          const data = res.ok ? await res.json() : null;
          if (data?.subscription?.status !== "active") setError(t("success.verifyError"));
        } catch {
          setError(t("success.verifyError"));
        } finally {
          setIsLoading(false);
        }
      };
      verificarSuscripcion();
      return;
    }

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
  }, [sessionId, conCreditos, t]);

  if (isLoading) return <Confirmando />;

  if (error) {
    return (
      <Centro>
        <Pliego tituloId="subscribe-success-titulo" etiqueta={t("eyebrow")} titulo={t("success.errorTitle")}>
          <AvisoError>{error}</AvisoError>
          <Link href="/subscribe" className={buttonClasses({ variant: "linea", size: "lg", className: "w-full" })}>
            {t("success.tryAgain")}
          </Link>
        </Pliego>
      </Centro>
    );
  }

  return (
    <Centro>
      <Pliego
        tituloId="subscribe-success-titulo"
        etiqueta={t("eyebrow")}
        titulo={t("success.title")}
        bajada={t("success.subtitle")}
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{t("success.active")}</Badge>
            {conCreditos && <Badge variant="primary">{t("paidWithCredits")}</Badge>}
          </div>
          <p className="border-l-[3px] border-rosa py-1 pl-4 text-[1.0625rem] leading-relaxed">{t("success.nextSteps")}</p>
        </div>

        <div className="mt-8 grid gap-3">
          <Link href="/daily" className={buttonClasses({ size: "lg", className: "w-full" })}>
            {t("success.goToDaily")}
          </Link>
          <Link href="/dashboard" className={buttonClasses({ variant: "linea", className: "w-full" })}>
            {t("success.goToDashboard")}
          </Link>
        </div>
      </Pliego>
    </Centro>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={<Confirmando />}>
      <SuccessContent />
    </Suspense>
  );
}
