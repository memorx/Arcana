"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  FOLLOWUP_COST,
  FOLLOWUP_LIMIT,
  FOLLOWUP_QUESTION_MAX_LENGTH,
  followUpCost,
} from "@/lib/ai/followup";

export interface FollowUpItem {
  id: string;
  question: string;
  answer: string;
  creditsCharged: number;
  /** ISO date string. */
  createdAt: string;
}

export interface FollowUpChatProps {
  readingId: string;
  initialFollowUps: FollowUpItem[];
  /** The user's credit balance when the page was rendered. */
  credits: number;
  locale: string;
}

/** La pregunta, como la intención: cursiva con el filete rosa. */
const PREGUNTA =
  "border-l-2 border-rosa pl-4 font-lectura text-[1.0625rem] leading-[1.5] break-words italic sm:text-[1.125rem]";
const ENLACE =
  "inline-flex min-h-11 items-center font-dato text-xs font-medium tracking-[0.1em] text-letra-acento uppercase underline-offset-[0.3em] hover:underline";

type ChatError = "unavailable" | "refused" | "credits" | "limit" | "rate" | "generic";

function paragraphs(text: string) {
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Follow-up questions under a finished reading: the conversation so far, the
 * counter ("3 of 5"), the cost of the next question before sending it, and the
 * loading and error states (503 retry keeps the question, 403 links to /credits).
 */
export function FollowUpChat({ readingId, initialFollowUps, credits: initialCredits, locale }: FollowUpChatProps) {
  const t = useTranslations("followUp");
  const fieldId = useId();
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(initialFollowUps);
  const [credits, setCredits] = useState(initialCredits);
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<ChatError | null>(null);

  const used = followUps.length;
  const limitReached = used >= FOLLOWUP_LIMIT;
  const nextCost = followUpCost(used);
  const cantPay = nextCost > credits;
  const isSending = pendingQuestion !== null;
  const trimmed = question.trim();

  const refresh = async () => {
    try {
      const res = await fetch(`/api/readings/${readingId}/followup`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.followUps)) setFollowUps(data.followUps);
    } catch {
      // keep what we have
    }
  };

  const send = async () => {
    if (!trimmed || isSending || limitReached || cantPay) return;

    setError(null);
    setPendingQuestion(trimmed);
    try {
      const res = await fetch(`/api/readings/${readingId}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, locale }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.followUp) {
        const saved = data.followUp as FollowUpItem;
        setFollowUps((prev) => [...prev, saved]);
        setCredits((c) => Math.max(0, c - (saved.creditsCharged ?? 0)));
        setQuestion("");
      } else if (res.status === 503) {
        setError("unavailable");
      } else if (res.status === 422) {
        setError("refused");
      } else if (res.status === 403 && data?.error === "insufficient_credits") {
        // The server's balance wins over the one rendered with the page.
        setCredits(0);
        setError("credits");
      } else if (res.status === 409) {
        setError("limit");
        await refresh();
      } else if (res.status === 429) {
        setError("rate");
      } else {
        setError("generic");
      }
    } catch {
      setError("generic");
    } finally {
      setPendingQuestion(null);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  // Ctrl/Cmd + Enter sends; Enter alone adds a line.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      send();
    }
  };

  return (
    <section aria-labelledby={`${fieldId}-titulo`} className="grid max-w-[760px] gap-5 border-t border-filete/20 pt-8">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id={`${fieldId}-titulo`} className="font-titulo text-[clamp(1.4rem,1.15rem+0.8vw,1.8rem)] leading-[1.1]">
            {t("title")}
          </h2>
          <Badge variant="primary" className="shrink-0" aria-label={t("counterLabel", { used, limit: FOLLOWUP_LIMIT })}>
            {t("counter", { used, limit: FOLLOWUP_LIMIT })}
          </Badge>
        </div>
        <p className="max-w-[60ch] text-[0.9375rem] leading-[1.5] text-letra-suave">
          {t("subtitle", { limit: FOLLOWUP_LIMIT, cost: FOLLOWUP_COST })}
        </p>
      </div>

      {(followUps.length > 0 || isSending) && (
        <ol className="grid gap-8" aria-live="polite" aria-busy={isSending}>
          {followUps.map((item) => (
            <li key={item.id} className="grid gap-3">
              <p className={PREGUNTA}>
                <span className="sr-only">{t("yourQuestion")}: </span>
                {item.question}
              </p>
              <div className="grid gap-3 pl-[18px]">
                <span className="sr-only">{t("answerLabel")}: </span>
                {paragraphs(item.answer).map((p, i) => (
                  <p key={i} className="font-lectura leading-[1.7] break-words">
                    {p}
                  </p>
                ))}
                <p className="font-dato text-[0.625rem] tracking-[0.1em] text-letra-suave uppercase">
                  {item.creditsCharged > 0 ? t("paid", { count: item.creditsCharged }) : t("free")}
                </p>
              </div>
            </li>
          ))}

          {pendingQuestion !== null && (
            <li className="grid gap-3">
              <p className={PREGUNTA}>{pendingQuestion}</p>
              <div role="status" className="flex items-center gap-2 pl-[18px] font-dato text-xs tracking-[0.06em] text-letra-suave">
                <span aria-hidden="true" className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full bg-rosa motion-safe:animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
                {t("sending")}
              </div>
            </li>
          )}
        </ol>
      )}

      {limitReached ? (
        <p className="border-t border-filete/20 pt-4 text-[0.9375rem] text-letra-suave">
          {t("limitReached", { limit: FOLLOWUP_LIMIT })}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-3">
          <label htmlFor={fieldId} className="font-dato text-[0.6875rem] tracking-[0.1em] text-letra-suave uppercase">
            {t("yourQuestion")}
          </label>
          <textarea
            id={fieldId}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={FOLLOWUP_QUESTION_MAX_LENGTH}
            rows={3}
            disabled={isSending}
            placeholder={t("placeholder")}
            className="block w-full resize-y rounded-none border-0 border-y border-filete/40 bg-transparent px-0 py-3 font-lectura text-[1.0625rem] leading-[1.6] text-letra placeholder:text-letra-suave focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none disabled:opacity-60"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 font-dato text-[0.6875rem] tracking-[0.04em]">
            <p className={cn(nextCost > 0 ? "text-letra-acento" : "text-letra-exito")}>
              {nextCost > 0
                ? t("costPaid", { cost: nextCost, credits })
                : t("costFree")}
            </p>
            <span className="text-letra-suave" aria-hidden="true">
              {t("charCount", { count: question.length, max: FOLLOWUP_QUESTION_MAX_LENGTH })}
            </span>
          </div>

          {cantPay && error !== "credits" && (
            <p className="text-[0.9375rem]">
              {t("noCredits")}{" "}
              <Link href="/credits" className={ENLACE}>
                {t("buyCredits")} &rarr;
              </Link>
            </p>
          )}

          {error && (
            <div role="alert" className="border-l-2 border-rosa bg-papel-hondo px-4 py-3">
              <p className="text-[0.9375rem] leading-[1.5]">{t(`errors.${error}`, { limit: FOLLOWUP_LIMIT })}</p>
              {error === "credits" && (
                <Link href="/credits" className={cn(ENLACE, "mt-1")}>
                  {t("buyCredits")} &rarr;
                </Link>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSending} disabled={!trimmed || cantPay}>
              {error === "unavailable"
                ? t("retry")
                : nextCost > 0
                  ? t("submitPaid", { cost: nextCost })
                  : t("submit")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
