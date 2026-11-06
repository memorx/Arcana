"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button, Badge } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { CREDIT_PACKAGES, CreditPackage } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/** Costo de cada tirada en créditos (mismos números que antes). */
const COSTOS = [
  { llave: "threeCard", creditos: 1 },
  { llave: "simpleCross", creditos: 2 },
  { llave: "horseshoe", creditos: 2 },
  { llave: "celticCross", creditos: 3 },
] as const;

/** Filetes de la tira de costos: dos columnas en móvil, cuatro desde md. */
const FILETES_COSTO = [
  "",
  "border-l border-tinta/25",
  "border-t border-tinta/25 md:border-t-0 md:border-l",
  "border-t border-l border-tinta/25 md:border-t-0",
];

export default function CreditsPage() {
  const t = useTranslations("credits");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const locale = useLocale();
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [freeReadings, setFreeReadings] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user/credits");
        if (res.ok) {
          const data = await res.json();
          setUserCredits(data.credits);
          setFreeReadings(data.freeReadingsLeft);
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasingId(pkg.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Error");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(tCommon("errorTryAgain"));
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="grid gap-[clamp(40px,7vh,72px)]">
      {/* Encabezado */}
      <header className="grid max-w-[760px] gap-3.5">
        <Etiqueta>{t("eyebrow")}</Etiqueta>
        <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
        <p className="max-w-[56ch] text-grafito">{t("subtitle")}</p>
      </header>

      {/* Saldo actual */}
      <section
        aria-labelledby="saldo-titulo"
        aria-busy={isLoading}
        className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-y border-tinta py-6"
      >
        <div className="grid gap-3">
          <h2 id="saldo-titulo" className="font-dato text-xs leading-[1.4] tracking-[0.12em] text-grafito uppercase">
            {t("currentBalance")}
          </h2>
          {isLoading ? (
            <div aria-hidden="true" className="h-12 w-48 bg-papel-hondo motion-safe:animate-pulse" />
          ) : (
            <p className="font-dato text-[clamp(2.25rem,1.7rem+2vw,3.25rem)] leading-none tracking-[-0.03em]">
              {userCredits ?? "—"}{" "}
              <span className="text-sm tracking-[0.12em] text-grafito uppercase">{t("creditsUnit")}</span>
            </p>
          )}
        </div>
        {!isLoading && freeReadings !== null && freeReadings > 0 && (
          <Badge variant="success">+{tDashboard("freeReadings", { count: freeReadings })}</Badge>
        )}
      </section>

      {/* Lo que cuesta cada tirada */}
      <section aria-labelledby="costos-titulo" className="grid gap-5">
        <h2 id="costos-titulo" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1]">
          {t("costsTitle")}
        </h2>
        <dl className="grid grid-cols-2 border-y border-tinta md:grid-cols-4">
          {COSTOS.map((costo, i) => (
            <div key={costo.llave} className={cn("grid content-start gap-1.5 px-4 py-5 md:px-5", FILETES_COSTO[i])}>
              <dt className="font-titulo text-[1.2rem] leading-tight">{t(`spreadCosts.${costo.llave}`)}</dt>
              <dd className="font-dato text-xs tracking-[0.1em] text-rosa-texto uppercase">
                {t("costCredits", { count: costo.creditos })}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Paquetes de créditos: láminas con la cifra en mono; el popular lleva el sello rosa */}
      <section aria-labelledby="paquetes-titulo" className="grid gap-6">
        <h2 id="paquetes-titulo" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1]">
          {t("packagesTitle")}
        </h2>
        <ul className="grid gap-x-6 gap-y-8 pt-3 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => {
            const tituloId = `paquete-${pkg.id}`;
            return (
              <li
                key={pkg.id}
                data-popular={pkg.popular || undefined}
                className={cn(
                  "relative grid content-start gap-5 border bg-papel p-6",
                  pkg.popular ? "border-rosa border-t-[3px] bg-papel-hondo/50" : "border-tinta/70"
                )}
              >
                {pkg.popular && (
                  <p className="absolute -top-3.5 right-5 rotate-[-3deg] rounded-full bg-rosa-luz px-3 py-1 font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-tinta uppercase">
                    {t("popular")}
                  </p>
                )}
                <h3 id={tituloId} className="grid gap-1.5 font-dato font-normal">
                  <span className="text-[clamp(3rem,2.6rem+1.6vw,4rem)] leading-none tracking-[-0.04em]">{pkg.credits}</span>
                  <span className="text-xs tracking-[0.12em] text-grafito uppercase">{t("creditsUnit")}</span>
                </h3>
                <div className="grid gap-1 border-t border-tinta/15 pt-4">
                  <p className="font-dato text-[1.5rem] leading-tight tracking-[-0.01em]">{pkg.priceDisplay}</p>
                  <p className="text-grafito">{locale === "en" ? pkg.description : pkg.descriptionEs}</p>
                </div>
                <Button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasingId !== null}
                  isLoading={purchasingId === pkg.id}
                  aria-label={`${t("buy")} · ${t("costCredits", { count: pkg.credits })}`}
                  className="mt-1 w-full"
                  size="lg"
                  variant={pkg.popular ? "primario" : "linea"}
                >
                  {t("buy")}
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Nota de seguridad */}
        <p className="flex items-center justify-center gap-2 text-center text-[0.9375rem] text-grafito">
          <svg aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          {t("securePayment")}
        </p>
      </section>
    </div>
  );
}
