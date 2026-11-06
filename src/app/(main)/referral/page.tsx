"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralCredits: number;
}

export default function ReferralPage() {
  const { status } = useSession();
  const t = useTranslations("referral");
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/referral")
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const referralLink = data?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${data.referralCode}`
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(t("shareText", { link: referralLink }));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(t("twitterText"));
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  if (status === "unauthenticated") {
    return (
      <div className="grid max-w-[760px] gap-3.5 py-6">
        <Etiqueta>{t("eyebrow")}</Etiqueta>
        <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("loginRequired")}</h1>
        <p className="text-grafito">{t("loginRequiredDesc")}</p>
      </div>
    );
  }

  const pasos = [t("step1"), t("step2"), t("step3")];

  return (
    <div className="grid gap-[clamp(40px,7vh,64px)]">
      {/* Encabezado */}
      <header className="grid max-w-[760px] gap-3.5">
        <Etiqueta>{t("eyebrow")}</Etiqueta>
        <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
        <p className="max-w-[52ch] text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] text-grafito">{t("subtitle")}</p>
      </header>

      <div className="grid items-start gap-[clamp(40px,6vw,72px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Cómo funciona */}
        <section aria-labelledby="como-titulo" className="grid gap-5">
          <h2 id="como-titulo" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1]">
            {t("howItWorks")}
          </h2>
          <ol className="border-y border-tinta">
            {pasos.map((paso, i) => (
              <li key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-3 border-t border-tinta/15 py-4 first:border-t-0">
                <span aria-hidden="true" className="font-dato text-sm text-rosa-texto">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[1.0625rem] leading-snug">{paso}</p>
              </li>
            ))}
          </ol>

          {/* Cifras */}
          {!loading && data && (
            <dl className="grid grid-cols-2 border-b border-tinta/15">
              <div className="grid gap-1 py-4 pr-4">
                <dt className="font-dato text-xs tracking-[0.12em] text-grafito uppercase">{t("friendsReferred")}</dt>
                <dd className="font-dato text-[2.25rem] leading-none tracking-[-0.03em]">{data.referralCount}</dd>
              </div>
              <div className="grid gap-1 border-l border-tinta/15 py-4 pl-5">
                <dt className="font-dato text-xs tracking-[0.12em] text-grafito uppercase">{t("creditsEarned")}</dt>
                <dd className="font-dato text-[2.25rem] leading-none tracking-[-0.03em] text-rosa-texto">
                  {data.referralCredits}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Tu enlace: el código en mono y copiar accesible */}
        <section
          aria-labelledby="enlace-titulo"
          aria-busy={loading}
          className="grid gap-6 border border-tinta/80 border-t-[3px] border-t-rosa bg-papel-hondo/50 p-[clamp(20px,4vw,32px)]"
        >
          <h2 id="enlace-titulo" className="text-[clamp(1.4rem,1.15rem+0.9vw,1.85rem)] leading-[1.15]">
            {t("yourLink")}
          </h2>

          {loading ? (
            <div aria-hidden="true" className="grid gap-4">
              <div className="h-16 bg-papel-hondo motion-safe:animate-pulse" />
              <div className="h-12 bg-papel-hondo motion-safe:animate-pulse" />
            </div>
          ) : (
            <>
              {data?.referralCode && (
                <div className="grid gap-1.5">
                  <p className="font-dato text-xs tracking-[0.12em] text-grafito uppercase">{t("yourCode")}</p>
                  <p className="font-dato text-[clamp(1.75rem,1.3rem+1.8vw,2.6rem)] leading-none tracking-[0.08em] break-all">
                    {data.referralCode}
                  </p>
                </div>
              )}

              <div className="grid gap-3">
                <label
                  htmlFor="referral-enlace"
                  className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-grafito uppercase"
                >
                  {t("linkLabel")}
                </label>
                <div className="flex flex-wrap items-stretch gap-3">
                  <input
                    id="referral-enlace"
                    type="text"
                    readOnly
                    value={referralLink}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-h-12 min-w-0 flex-[1_1_14rem] rounded-none border-0 border-b border-tinta/50 bg-transparent px-0 font-dato text-[0.8125rem] text-tinta focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none"
                  />
                  <Button variant="linea" onClick={copyToClipboard} className="flex-none">
                    {copied ? t("copied") : t("copy")}
                  </Button>
                </div>
                {/* Anuncio para lectores de pantalla al copiar */}
                <p id="referral-copiado" role="status" aria-live="polite" className="sr-only">
                  {copied ? t("copied") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-tinta/15 pt-5">
                <Button onClick={shareOnWhatsApp} className="flex-1 basis-40">
                  WhatsApp
                </Button>
                <Button onClick={shareOnTwitter} variant="linea" className="flex-1 basis-40">
                  Twitter
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Límite */}
      <p className="font-dato text-xs tracking-[0.08em] text-grafito uppercase">{t("limit")}</p>
    </div>
  );
}
