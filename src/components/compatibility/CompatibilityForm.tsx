"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";

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
const MIN_DATE = "1900-01-01";

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
      <Card variant="highlighted" className="flex min-h-[22rem] items-center justify-center">
        <div role="status" aria-live="polite" className="px-6 py-10 text-center">
          <div aria-hidden="true" className="mb-6 flex justify-center gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 w-16 rounded-lg border-2 border-amber-500/40 bg-gradient-to-br from-purple-800/70 to-slate-900 motion-safe:animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <p className="text-lg font-medium text-slate-100">{t("form.loading")}</p>
          <p className="mt-2 text-sm text-slate-400">{t("form.loadingHint")}</p>
        </div>
      </Card>
    );
  }

  const showRetry = formError === "unavailable";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("form.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            className="[color-scheme:dark]"
            error={fieldErrors.partnerBirthDate}
          />

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

          {/* Cost and balance */}
          <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              {t("form.costLabel")}:{" "}
              <span className="font-semibold text-amber-300">{t("form.cost", { cost })}</span>
            </p>
            <p className={canAfford ? "text-sm text-slate-400" : "text-sm text-orange-300"}>
              {t("form.balance", { credits })}
            </p>
          </div>

          {!canAfford && (
            <div className="flex flex-col gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-orange-200">{t("form.notEnoughCredits", { cost })}</p>
              <Link
                href="/credits"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                {t("form.buyCredits")}
              </Link>
            </div>
          )}

          {formError && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p>{t(`errors.${formError}`)}</p>
              {formError === "insufficientCredits" && (
                <Link href="/credits" className="mt-2 inline-block font-medium text-amber-300 underline underline-offset-4">
                  {t("form.buyCredits")}
                </Link>
              )}
              {formError === "profileRequired" && (
                <Link href="/profile/setup" className="mt-2 inline-block font-medium text-amber-300 underline underline-offset-4">
                  {t("profileRequired.cta")}
                </Link>
              )}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canAfford}
            aria-label={showRetry ? t("form.retry") : t("form.submitAria", { cost })}
          >
            {showRetry ? t("form.retry") : t("form.submit")}
          </Button>
          <p className="text-center text-xs text-slate-500">{t("form.noCharge")}</p>
        </form>
      </CardContent>
    </Card>
  );
}
