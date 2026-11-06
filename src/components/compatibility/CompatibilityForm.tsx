"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonClasses, Input } from "@/components/ui";
import { ReversoCarta } from "@/components/tinta/ReversoCarta";

/** Mono text link with a 44 px touch target (inside the error notice). */
const ENLACE =
  "inline-flex min-h-11 items-center font-dato text-[0.6875rem] tracking-[0.12em] text-letra uppercase underline underline-offset-[0.3em]";

interface CompatibilityFormProps {
  credits: number;
  cost: number;
}

type FieldErrors = Partial<Record<"partnerName" | "partnerBirthDate" | "partnerFullName", string>>;

type FormError =
  | "insufficientCredits"
  | "profileRequired"
  | "unavailable"
  | "refused"
  | "rateLimited"
  | "unconfirmed"
  | "generic";

const NAME_MAX = 60;
const FULL_NAME_MAX = 80;
/** Same limit as MIN_BIRTH_YEAR in lib/compatibility (the lunar table starts in 1924). */
const MIN_DATE = "1924-01-01";

/** Today as "YYYY-MM-DD" in the person's own time zone (for the date picker). */
function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const BIRTH_DATE_ERRORS: Record<string, string> = {
  future: "errors.birthDateFuture",
  too_old: "errors.birthDateTooOld",
  invalid: "errors.birthDateInvalid",
};

export function CompatibilityForm({ credits, cost }: CompatibilityFormProps) {
  const t = useTranslations("compatibility");
  const locale = useLocale();
  const router = useRouter();

  const [partnerName, setPartnerName] = useState("");
  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [partnerFullName, setPartnerFullName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAfford = credits >= cost;
  const today = localToday();

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!partnerBirthDate) errors.partnerBirthDate = t("errors.birthDateRequired");
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(partnerBirthDate)) errors.partnerBirthDate = t("errors.birthDateInvalid");
    else if (partnerBirthDate > today) errors.partnerBirthDate = t("errors.birthDateFuture");
    else if (partnerBirthDate < MIN_DATE) errors.partnerBirthDate = t("errors.birthDateTooOld");
    if (partnerName.trim().length > NAME_MAX) errors.partnerName = t("errors.nameTooLong");
    if (partnerFullName.trim().length > FULL_NAME_MAX) errors.partnerFullName = t("errors.fullNameTooLong");
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !canAfford) return;

    const errors = validate();
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName: partnerName.trim() || undefined,
          partnerBirthDate,
          partnerFullName: partnerFullName.trim() || undefined,
          locale,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.reading?.id) {
        // Keep the loading state while the reading page opens.
        router.push(`/compatibility/${data.reading.id}`);
        return;
      }

      if (response.status === 401) {
        router.push("/login?callbackUrl=/compatibility");
        return;
      }

      if (response.status === 400) {
        if (data?.error === "invalid_partner_birth_date") {
          setFieldErrors({ partnerBirthDate: t(BIRTH_DATE_ERRORS[data.reason] ?? "errors.birthDateInvalid") });
        } else if (data?.error === "invalid_partner_name") {
          setFieldErrors({ partnerName: t("errors.nameTooLong") });
        } else if (data?.error === "invalid_partner_full_name") {
          setFieldErrors({ partnerFullName: t("errors.fullNameTooLong") });
        } else {
          setFormError("generic");
        }
      } else if (response.status === 403) {
        setFormError("insufficientCredits");
      } else if (response.status === 404) {
        setFormError("profileRequired");
      } else if (response.status === 422) {
        setFormError("refused");
      } else if (response.status === 429) {
        setFormError("rateLimited");
      } else if (response.status === 503) {
        setFormError("unavailable");
      } else if (response.status === 500) {
        setFormError("generic");
      } else {
        // 502/504 (e.g. the function timed out) or anything unexpected: the reading may
        // have been saved and charged. Refresh the list instead of inviting a retry.
        setFormError("unconfirmed");
        router.refresh();
      }
    } catch {
      // The connection dropped: same uncertainty as a gateway error.
      setFormError("unconfirmed");
      router.refresh();
    }
    setIsSubmitting(false);
  };

  if (isSubmitting) {
    return (
      <section
        aria-labelledby="compatibility-form-title"
        data-estado="leyendo"
        className="grid min-h-[22rem] place-items-center border-t border-filete bg-papel-hondo px-6 py-10"
      >
        <h2 id="compatibility-form-title" className="sr-only">
          {t("form.title")}
        </h2>
        <div role="status" aria-live="polite" className="grid justify-items-center gap-6 text-center">
          <div aria-hidden="true" className="flex justify-center gap-3">
            {[0, 1, 2].map((i) => (
              <ReversoCarta
                key={i}
                className="h-28 w-16 rounded-[6px] motion-safe:animate-pulse"
                style={{ animationDelay: `${i * 220}ms` }}
              />
            ))}
          </div>
          <p className="text-[clamp(1.25rem,1.1rem+0.5vw,1.45rem)] leading-[1.4] italic">{t("form.loading")}</p>
          <p className="max-w-[40ch] font-dato text-[0.6875rem] leading-[1.6] tracking-[0.08em] text-letra-suave uppercase">
            {t("form.loadingHint")}
          </p>
        </div>
      </section>
    );
  }

  const showRetry = formError === "unavailable";

  return (
    <section aria-labelledby="compatibility-form-title" className="border-t border-filete pt-6">
      <h2 id="compatibility-form-title" className="text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]">
        {t("form.title")}
      </h2>
      <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            id="partnerName"
            name="partnerName"
            label={t("form.partnerName")}
            hint={t("form.partnerNameHint")}
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="off"
            error={fieldErrors.partnerName}
          />

          <Input
            id="partnerBirthDate"
            name="partnerBirthDate"
            type="date"
            label={t("form.partnerBirthDate")}
            value={partnerBirthDate}
            onChange={(e) => setPartnerBirthDate(e.target.value)}
            min={MIN_DATE}
            max={today}
            required
            aria-required="true"
            className="min-h-11"
            error={fieldErrors.partnerBirthDate}
          />
        </div>

        <Input
          id="partnerFullName"
          name="partnerFullName"
          label={t("form.partnerFullName")}
          hint={t("form.partnerFullNameHint")}
          value={partnerFullName}
          onChange={(e) => setPartnerFullName(e.target.value)}
          maxLength={FULL_NAME_MAX}
          autoComplete="off"
          error={fieldErrors.partnerFullName}
        />

        {/* Cost and balance, as data */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-y border-filete/25 py-4 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] uppercase">
          <p>
            <span className="text-letra-suave">{t("form.costLabel")}: </span>
            <span className="text-letra-acento">{t("form.cost", { cost })}</span>
          </p>
          <p className={canAfford ? "text-letra-suave" : "text-letra-error"}>{t("form.balance", { credits })}</p>
        </div>

        {!canAfford && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-rosa pl-4">
            <p className="text-[1.0625rem] leading-[1.6]">{t("form.notEnoughCredits", { cost })}</p>
            <Link href="/credits" className={buttonClasses({ variant: "linea", size: "sm", className: "shrink-0" })}>
              {t("form.buyCredits")}
            </Link>
          </div>
        )}

        {formError && (
          <div role="alert" className="grid gap-2 border-l-2 border-letra-error pl-4 text-[1.0625rem] leading-[1.6] text-letra-error">
            <p>{t(`errors.${formError}`)}</p>
            {formError === "insufficientCredits" && (
              <Link href="/credits" className={ENLACE}>
                {t("form.buyCredits")}
              </Link>
            )}
            {formError === "profileRequired" && (
              <Link href="/profile/setup" className={ENLACE}>
                {t("profileRequired.cta")}
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-3">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canAfford}
            aria-label={showRetry ? t("form.retry") : t("form.submitAria", { cost })}
          >
            {showRetry ? t("form.retry") : t("form.submit")}
          </Button>
          <p className="text-center font-dato text-[0.625rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
            {t("form.noCharge")}
          </p>
        </div>
      </form>
    </section>
  );
}
