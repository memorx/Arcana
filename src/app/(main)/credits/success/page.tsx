"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui";
import { AvisoError, Pliego } from "@/app/(auth)/pliego";

interface SessionData {
  status: string;
  paymentStatus: string;
  credits: number;
  amountTotal: number;
}

/** El pliego centrado en la columna de la app. */
function Centro({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-[clamp(8px,4vh,40px)]">{children}</div>;
}

function Verificando() {
  const t = useTranslations("credits");
  return (
    <Centro>
      <div aria-busy="true" className="w-full max-w-[30rem]">
        <Pliego tituloId="credits-success-titulo" etiqueta={t("eyebrow")} titulo={t("success.verifying")}>
          <div aria-hidden="true" className="grid gap-4">
            <div className="h-24 bg-papel-hondo motion-safe:animate-pulse" />
            <div className="h-4 w-2/3 bg-papel-hondo motion-safe:animate-pulse" />
          </div>
        </Pliego>
      </div>
    </Centro>
  );
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

  if (isLoading) return <Verificando />;

  if (error || !sessionData) {
    return (
      <Centro>
        <Pliego tituloId="credits-success-titulo" etiqueta={t("eyebrow")} titulo={t("error.title")}>
          <AvisoError>{error || t("error.subtitle")}</AvisoError>
          <Link href="/credits" className={buttonClasses({ size: "lg", className: "w-full" })}>
            {t("error.retry")}
          </Link>
        </Pliego>
      </Centro>
    );
  }

  return (
    <Centro>
      <Pliego
        tituloId="credits-success-titulo"
        etiqueta={t("eyebrow")}
        titulo={t("success.title")}
        bajada={t("success.subtitle")}
      >
        {/* Créditos agregados: la cifra en mono, con el filete rosa del sello */}
        <div className="grid gap-2 border-l-[3px] border-rosa py-1 pl-5">
          <p className="font-dato text-xs leading-[1.4] tracking-[0.12em] text-grafito uppercase">
            {t("success.creditsAdded")}
          </p>
          <p className="font-dato text-[clamp(3rem,2.5rem+2vw,4rem)] leading-none tracking-[-0.04em] text-tinta">
            +{sessionData.credits}
          </p>
        </div>

        <p className="mt-6 font-dato text-xs leading-[1.5] tracking-[0.08em] text-grafito uppercase">
          {t("success.amountPaid")}: ${((sessionData.amountTotal || 0) / 100).toFixed(2)} MXN
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/reading/new" className={buttonClasses({ size: "lg", className: "flex-1 basis-56" })}>
            {t("success.startReading")}
          </Link>
          <Link
            href="/credits"
            className={buttonClasses({ variant: "linea", size: "lg", className: "flex-1 basis-56" })}
          >
            {t("success.viewCredits")}
          </Link>
        </div>
      </Pliego>
    </Centro>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<Verificando />}>
      <SuccessContent />
    </Suspense>
  );
}
