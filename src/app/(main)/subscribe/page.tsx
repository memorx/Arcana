"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button, Badge, buttonClasses } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { getZodiacSignEs } from "@/lib/zodiac";

interface UserProfile {
  fullName: string;
  zodiacSign: string;
  focusArea: string;
  emailTime: string;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: string;
}

const ENLACE =
  "inline-flex min-h-11 items-center text-rosa-texto underline decoration-rosa-texto/40 underline-offset-4 transition-colors hover:decoration-rosa-texto";

export default function SubscribePage() {
  const router = useRouter();
  const t = useTranslations("subscribe");
  const tProfile = useTranslations("profile");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingCredits, setIsProcessingCredits] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userCredits, setUserCredits] = useState(0);

  const plan = SUBSCRIPTION_PLANS[0]; // Daily Oracle plan

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, subRes, creditsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/subscription"),
          fetch("/api/user/credits"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.profile);
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.subscription);
        }

        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          setUserCredits(creditsData.credits || 0);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async () => {
    if (!profile) {
      router.push("/profile/setup");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Error");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert(t("subscriptionError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribeWithCredits = async () => {
    if (!profile) {
      router.push("/profile/setup");
      return;
    }

    setIsProcessingCredits(true);
    try {
      const res = await fetch("/api/subscribe/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (res.ok) {
        // Keep loading state while navigating
        router.push("/subscribe/success?method=credits");
      } else {
        throw new Error(data.error || "Error");
      }
    } catch (error) {
      console.error("Credits subscription error:", error);
      alert(t("subscriptionError"));
      setIsProcessingCredits(false);
    }
  };

  const features = locale === "en" ? plan.features : plan.featuresEs;

  const encabezado = (titulo: string, bajada?: string) => (
    <header className="grid max-w-[760px] gap-3.5">
      <Etiqueta>{t("eyebrow")}</Etiqueta>
      <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{titulo}</h1>
      {bajada && <p className="max-w-[52ch] text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] text-grafito">{bajada}</p>}
    </header>
  );

  /**
   * Lámina del plan: descripción, lo que incluye con filetes y el precio en mono. Con `conNombre` (vista «ya
   * suscrito») el h2 es el nombre del plan; en el alta el h1 ya lo dice, así que el h2 es «Incluye».
   */
  const laminaPlan = (conNombre: boolean) => (
    <section aria-labelledby="plan-titulo" className="grid gap-6 border-t border-tinta pt-6">
      {conNombre && (
        <h2 id="plan-titulo" className="text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]">
          {locale === "en" ? plan.name : plan.nameEs}
        </h2>
      )}
      <p className="max-w-[56ch] text-[1.0625rem] leading-relaxed">{t("description")}</p>

      <div className="grid gap-3">
        {conNombre ? (
          <Etiqueta>{t("included")}</Etiqueta>
        ) : (
          <Etiqueta as="h2" id="plan-titulo">
            {t("included")}
          </Etiqueta>
        )}
        <ul className="border-b border-tinta/15">
          {features.map((feature, i) => (
            <li key={i} className="flex items-baseline gap-3 border-t border-tinta/15 py-3">
              <span aria-hidden="true" className="font-dato text-xs text-rosa-texto">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="font-dato text-[clamp(1.75rem,1.4rem+1.2vw,2.4rem)] leading-none tracking-[-0.02em]">
        {plan.priceDisplay}
      </p>
    </section>
  );

  if (isLoading) {
    return (
      <div aria-busy="true" className="grid gap-[clamp(32px,6vh,56px)]">
        {encabezado(t("title"), t("subtitle"))}
        <div aria-hidden="true" className="grid gap-6 md:grid-cols-2">
          <div className="h-96 bg-papel-hondo motion-safe:animate-pulse" />
          <div className="h-96 bg-papel-hondo motion-safe:animate-pulse" />
        </div>
      </div>
    );
  }

  // Already subscribed view
  if (subscription && subscription.status === "active") {
    return (
      <div className="grid gap-[clamp(32px,6vh,56px)]">
        {encabezado(t("alreadySubscribed"))}

        <div className="grid items-start gap-[clamp(40px,6vw,72px)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid gap-8">
            <section className="grid gap-4 border-y border-tinta py-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">{t("success.active")}</Badge>
                {subscription.cancelAtPeriodEnd && <Badge variant="primary">{t("cancelsAtPeriodEnd")}</Badge>}
              </div>

              {subscription.currentPeriodEnd && (
                <p className="text-[1.0625rem]">
                  {t("activeUntil", {
                    date: new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      locale === "en" ? "en-US" : "es-ES",
                      { day: "numeric", month: "long", year: "numeric" }
                    ),
                  })}
                </p>
              )}
            </section>

            <div className="flex flex-wrap gap-3">
              <Link href="/daily" className={buttonClasses({ size: "lg" })}>
                {t("success.goToDaily")}
              </Link>
              {/* Ruta de API que redirige al portal de Stripe: navegación completa, sin prefetch */}
              <a href="/api/stripe/portal" className={buttonClasses({ variant: "linea", size: "lg" })}>
                {t("manageSubscription")}
              </a>
            </div>
          </div>

          {laminaPlan(true)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-[clamp(32px,6vh,56px)]">
      {encabezado(t("title"), t("subtitle"))}

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
        {laminaPlan(false)}

        {/* Pliego para suscribirse */}
        <section
          aria-labelledby="suscribirse-titulo"
          className="grid gap-6 border border-tinta/80 border-t-[3px] border-t-rosa bg-papel-hondo/50 p-[clamp(20px,4vw,32px)]"
        >
          <h2 id="suscribirse-titulo" className="text-[clamp(1.4rem,1.15rem+0.9vw,1.85rem)] leading-[1.15]">
            {profile ? t("cta") : t("setupFirst")}
          </h2>

          {profile ? (
            <>
              {/* Resumen del perfil */}
              <div className="grid gap-3 border-y border-tinta/15 py-4">
                <div className="grid gap-1">
                  <p className="font-titulo text-[1.25rem] leading-tight">{profile.fullName}</p>
                  <p className="font-dato text-xs tracking-[0.1em] text-grafito uppercase">
                    {locale === "en" ? profile.zodiacSign : getZodiacSignEs(profile.zodiacSign)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{tProfile(`focusAreas.${profile.focusArea}`)}</Badge>
                  <Badge variant="secondary">{profile.emailTime}</Badge>
                </div>
              </div>

              <Button onClick={handleSubscribe} className="w-full" size="lg" isLoading={isProcessing}>
                {t("cta")}
              </Button>

              {/* Separador */}
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="h-px flex-1 bg-tinta/20" />
                <span className="font-dato text-[0.6875rem] tracking-[0.12em] text-grafito uppercase">
                  {t("orPayWithCredits")}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-tinta/20" />
              </div>

              {/* Pagar con créditos */}
              <div className="grid gap-3 border border-tinta/25 bg-papel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{t("payWithCredits")}</span>
                  <Badge variant="primary">
                    {plan.creditsCost} {t("creditsPerMonth")}
                  </Badge>
                </div>
                <Button
                  onClick={handleSubscribeWithCredits}
                  variant="linea"
                  className="w-full"
                  isLoading={isProcessingCredits}
                  disabled={!profile || userCredits < plan.creditsCost}
                >
                  {userCredits < plan.creditsCost
                    ? t("needMoreCredits", { count: plan.creditsCost - userCredits })
                    : t("subscribeWithCredits")}
                </Button>
                {userCredits < plan.creditsCost && (
                  <Link href="/credits" className={`${ENLACE} justify-self-center`}>
                    {t("buyCredits")}
                  </Link>
                )}
                <p className="text-center text-sm text-grafito">{t("renewsAutomatically")}</p>
              </div>

              <Link href="/profile/setup" className={`${ENLACE} justify-self-center`}>
                {t("editProfile")}
              </Link>
            </>
          ) : (
            <Link href="/profile/setup" className={buttonClasses({ size: "lg", className: "w-full" })}>
              {tProfile("title")}
            </Link>
          )}

          <p className="text-center font-dato text-[0.6875rem] tracking-[0.08em] text-grafito uppercase">
            {t("securePayment")}
          </p>
        </section>
      </div>
    </div>
  );
}
