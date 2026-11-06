"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button, buttonClasses, Input } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { GlifoSistema } from "@/components/blueprint/BlueprintBadges";
// Straight from the module (not the @/lib/systems barrel) to keep the other systems out of this client bundle.
import {
  WESTERN_ELEMENT_NAMES,
  WESTERN_MODALITY_NAMES,
  getWesternSign,
  getWesternSignByKey,
} from "@/lib/systems/western";
import { FOCUS_AREAS, EMAIL_TIMES } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/** A notice with the pink rule of the reading's intention (lectura.html); the color comes from the caller. */
const AVISO = "border-l-2 border-rosa pl-4 text-[1.0625rem] leading-[1.6]";
/** Legend of a group of options: data in mono. */
const LEYENDA = "font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase";
/** An option of the focus area / email time groups (≥ 44 px, pressed state in ink). */
const OPCION =
  "inline-flex min-h-11 cursor-pointer items-center gap-3 border py-2 text-[1rem] leading-[1.3] transition-colors duration-200";
const OPCION_ACTIVA = "border-tinta bg-tinta text-papel";
const OPCION_LIBRE = "border-filete/30 text-letra hover:border-filete";

interface ProfileData {
  fullName: string;
  birthDate: string;
  birthTime: string;
  focusArea: string;
  emailTime: string;
  zodiacSign: string;
}

export default function ProfileSetupPage() {
  const t = useTranslations("profile");
  const tBlueprint = useTranslations("blueprint.setup");
  const locale = useLocale();
  const signLocale = locale === "en" ? "en" : "es";

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const nextStepsRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ProfileData>({
    fullName: "",
    birthDate: "",
    birthTime: "",
    focusArea: "general",
    emailTime: "08:00",
    zodiacSign: "",
  });

  // Fetch existing profile if any
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setFormData({
              fullName: data.profile.fullName || "",
              birthDate: data.profile.birthDate
                ? new Date(data.profile.birthDate).toISOString().split("T")[0]
                : "",
              birthTime: data.profile.birthTime || "",
              focusArea: data.profile.focusArea || "general",
              emailTime: data.profile.emailTime || "08:00",
              zodiacSign: data.profile.zodiacSign || "",
            });
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Hide "continue to subscribe" after saving if the subscription is already active
  useEffect(() => {
    fetch("/api/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsSubscribed(data?.subscription?.status === "active"))
      .catch(() => {});
  }, []);

  // Calculate zodiac sign when birth date changes.
  // "YYYY-MM-DD" parses as midnight UTC and getWesternSign reads the UTC day,
  // so the sign does not shift a day back in time zones west of UTC.
  useEffect(() => {
    if (formData.birthDate) {
      const date = new Date(formData.birthDate);
      if (Number.isNaN(date.getTime())) return;
      try {
        const sign = getWesternSign(date).key;
        setFormData((prev) => ({ ...prev, zodiacSign: sign }));
      } catch {
        // Out-of-range date while typing: keep the previous sign
      }
    }
  }, [formData.birthDate]);

  // Move focus to the next steps once the profile is saved
  useEffect(() => {
    if (success) nextStepsRef.current?.focus();
  }, [success]);

  const westernSign = formData.zodiacSign ? getWesternSignByKey(formData.zodiacSign) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          birthDate: formData.birthDate,
          birthTime: formData.birthTime || null,
          focusArea: formData.focusArea,
          emailTime: formData.emailTime,
          locale,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error saving profile");
      }

      setSuccess(true);
      setIsSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving profile");
      setIsSaving(false);
    }
  };

  const getLocalizedFocusArea = (value: string) => {
    const area = FOCUS_AREAS.find((a) => a.value === value);
    return locale === "en" ? area?.labelEn : area?.labelEs;
  };

  if (isLoading) {
    const bloque = "rounded-sm bg-papel-hondo motion-safe:animate-pulse";
    return (
      <div className="grid gap-10" aria-busy="true">
        <div className="grid gap-3 border-b border-filete pb-8">
          <div className={`h-3 w-24 ${bloque}`} />
          <div className={`h-12 w-2/3 ${bloque}`} />
          <div className={`h-4 w-1/2 ${bloque}`} />
        </div>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className={`h-96 ${bloque}`} />
          <div className={`h-64 ${bloque}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      {/* Header */}
      <header className="grid gap-3 border-b border-filete pb-8">
        <Etiqueta>{t("eyebrow")}</Etiqueta>
        <h1 className="text-[clamp(2.2rem,1.4rem+2.8vw,3.75rem)] leading-[1.02]">{t("title")}</h1>
        <p className="max-w-[52ch] text-[1.125rem] leading-[1.6] text-letra-suave">{t("subtitle")}</p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <div className="min-w-0">
          {error && (
            <p role="alert" className={`${AVISO} mb-8 border-letra-error text-letra-error`}>
              {error}
            </p>
          )}

          {success && (
            <p role="status" className={`${AVISO} mb-8 border-letra-exito text-letra-exito`}>
              {t("saved")}
            </p>
          )}

          <form onSubmit={handleSubmit} className="grid gap-9">
            <div className="grid gap-7 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  id="profile-fullName"
                  name="fullName"
                  label={t("fullName")}
                  type="text"
                  placeholder={t("fullNamePlaceholder")}
                  value={formData.fullName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  autoComplete="name"
                  required
                />
              </div>

              <Input
                id="profile-birthDate"
                name="birthDate"
                label={t("birthDate")}
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    birthDate: e.target.value,
                  }))
                }
                className="min-h-11"
                required
              />

              <Input
                id="profile-birthTime"
                name="birthTime"
                label={t("birthTime")}
                hint={t("birthTimeTooltip")}
                type="time"
                value={formData.birthTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    birthTime: e.target.value,
                  }))
                }
                className="min-h-11"
              />
            </div>

            {/* Focus Area */}
            <fieldset className="grid gap-3">
              <legend className={`${LEYENDA} mb-2`}>{t("focusArea")}</legend>
              <p className="text-[0.9375rem] leading-[1.5] text-letra-suave">{t("focusAreaDescription")}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FOCUS_AREAS.map((area) => {
                  const activo = formData.focusArea === area.value;
                  return (
                    <button
                      key={area.value}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setFormData((prev) => ({ ...prev, focusArea: area.value }))}
                      className={cn(OPCION, "rounded-sm px-4 text-left", activo ? OPCION_ACTIVA : OPCION_LIBRE)}
                    >
                      <span
                        aria-hidden="true"
                        className={cn("size-2 shrink-0 rounded-full", activo ? "bg-rosa" : "border border-current/50")}
                      />
                      {locale === "en" ? area.labelEn : area.labelEs}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Email Time */}
            <fieldset className="grid gap-3">
              <legend className={`${LEYENDA} mb-2`}>{t("emailTime")}</legend>
              <p className="text-[0.9375rem] leading-[1.5] text-letra-suave">{t("emailTimeDescription")}</p>
              <div className="flex flex-wrap gap-2">
                {EMAIL_TIMES.map((time) => {
                  const activo = formData.emailTime === time.value;
                  return (
                    <button
                      key={time.value}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setFormData((prev) => ({ ...prev, emailTime: time.value }))}
                      className={cn(
                        OPCION,
                        "justify-center rounded-full px-4 font-dato text-[0.75rem] tracking-[0.06em] tabular-nums",
                        activo ? OPCION_ACTIVA : OPCION_LIBRE
                      )}
                    >
                      {time.label}
                    </button>
                  );
                })}
              </div>
              <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.06em] text-letra-acento uppercase">
                {t("emailTimeUtc")}
              </p>
            </fieldset>

            {/* Submit */}
            <Button type="submit" className="w-full sm:w-auto sm:justify-self-start" size="lg" isLoading={isSaving}>
              {isSaving ? t("saving") : t("save")}
            </Button>
          </form>

          {/* Next steps after saving */}
          {success && (
            <div
              ref={nextStepsRef}
              tabIndex={-1}
              role="region"
              aria-labelledby="profile-next-steps-title"
              className="mt-10 grid gap-4 border-t-[3px] border-rosa bg-papel-hondo p-5 focus:outline-none focus-visible:outline-2 focus-visible:outline-rosa sm:p-7"
            >
              <h2 id="profile-next-steps-title" className="text-[clamp(1.45rem,1.2rem+0.8vw,1.85rem)] leading-[1.1]">
                {tBlueprint("readyTitle")}
              </h2>
              <p className="text-[1.0625rem] leading-[1.6] text-letra-suave">{tBlueprint("readyText")}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/blueprint" className={buttonClasses({ variant: "primario" })}>
                  {tBlueprint("viewMap")}
                </Link>
                {!isSubscribed && (
                  <Link href="/subscribe" className={buttonClasses({ variant: "linea" })}>
                    {t("continue")}
                  </Link>
                )}
                <Link href="/dashboard" className={buttonClasses({ variant: "fantasma" })}>
                  {tBlueprint("dashboard")}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Zodiac Sign Display: the preview follows the birth date */}
        <aside aria-labelledby="profile-sign-title" className="order-first lg:sticky lg:order-none lg:top-[calc(var(--alto-cabecera)+24px)] lg:self-start">
          <div className="grid gap-5 border-b border-filete pb-6 lg:border-t lg:pt-6">
            <h2
              id="profile-sign-title"
              className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase"
            >
              {t("zodiacSign")}
            </h2>
            <div aria-live="polite" className="flex items-center gap-5">
              <span className="grid size-20 shrink-0 place-items-center rounded-full border border-filete text-[2.25rem]">
                {westernSign ? (
                  <GlifoSistema symbol={westernSign.emoji} isText={false} />
                ) : (
                  <span aria-hidden="true" className="font-titulo text-letra-suave">
                    ?
                  </span>
                )}
              </span>
              {westernSign ? (
                <div className="grid min-w-0 gap-1.5">
                  <p className="font-titulo text-[clamp(1.9rem,1.5rem+1.2vw,2.6rem)] leading-none">
                    {westernSign.name[signLocale]}
                  </p>
                  <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
                    {WESTERN_ELEMENT_NAMES[westernSign.element][signLocale]} ·{" "}
                    {WESTERN_MODALITY_NAMES[westernSign.modality][signLocale]}
                  </p>
                </div>
              ) : (
                <p className="font-titulo text-[1.9rem] leading-none text-letra-suave" aria-hidden="true">
                  —
                </p>
              )}
            </div>
            {formData.focusArea && (
              <dl className="grid gap-4 border-t border-filete/25 pt-5 min-[420px]:grid-cols-2">
                <div>
                  <dt className="font-dato text-[0.625rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
                    {t("focusArea")}
                  </dt>
                  <dd className="mt-1 font-titulo text-[1.15rem] leading-[1.2]">
                    {getLocalizedFocusArea(formData.focusArea)}
                  </dd>
                </div>
                <div>
                  <dt className="font-dato text-[0.625rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
                    {t("emailTime")}
                  </dt>
                  <dd className="mt-1 font-titulo text-[1.15rem] leading-[1.2] tabular-nums">
                    {EMAIL_TIMES.find((time) => time.value === formData.emailTime)?.label ?? formData.emailTime} UTC
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
