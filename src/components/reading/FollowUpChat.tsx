"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, CardContent } from "@/components/ui";
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
      } else if (res.status === 403) {
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
    <Card className="mt-8">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <span aria-hidden="true" className="text-xl">&#128172;</span>
            {t("title")}
          </h3>
          <Badge variant="primary" className="shrink-0" aria-label={t("counterLabel", { used, limit: FOLLOWUP_LIMIT })}>
            {t("counter", { used, limit: FOLLOWUP_LIMIT })}
          </Badge>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          {t("subtitle", { limit: FOLLOWUP_LIMIT, cost: FOLLOWUP_COST })}
        </p>

        {(followUps.length > 0 || isSending) && (
          <ol className="mb-4 space-y-4" aria-live="polite" aria-busy={isSending}>
            {followUps.map((item) => (
              <li key={item.id} className="space-y-2">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm border border-purple-500/30 bg-purple-500/15 px-4 py-2 text-sm text-purple-100">
                    <span className="sr-only">{t("yourQuestion")}: </span>
                    {item.question}
                  </p>
                </div>
                <div className="max-w-[95%] rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-800/50 px-4 py-3">
                  <span className="sr-only">{t("answerLabel")}: </span>
                  {paragraphs(item.answer).map((p, i) => (
                    <p key={i} className="mb-3 text-sm leading-relaxed text-slate-300 last:mb-0">
                      {p}
                    </p>
                  ))}
                  <p className="mt-2 text-[11px] text-slate-500">
                    {item.creditsCharged > 0 ? t("paid", { count: item.creditsCharged }) : t("free")}
                  </p>
                </div>
              </li>
            ))}

            {pendingQuestion !== null && (
              <li className="space-y-2">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm border border-purple-500/30 bg-purple-500/15 px-4 py-2 text-sm text-purple-100">
                    {pendingQuestion}
                  </p>
                </div>
                <div role="status" className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400">
                  <span aria-hidden="true" className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-amber-400/80 motion-safe:animate-pulse"
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
          <p className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
            {t("limitReached", { limit: FOLLOWUP_LIMIT })}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor={fieldId} className="block text-sm font-medium text-slate-300">
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
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className={cn(nextCost > 0 ? "text-amber-300" : "text-emerald-300")}>
                {nextCost > 0
                  ? t("costPaid", { cost: nextCost, credits })
                  : t("costFree")}
              </p>
              <span className="text-slate-500" aria-hidden="true">
                {t("charCount", { count: question.length, max: FOLLOWUP_QUESTION_MAX_LENGTH })}
              </span>
            </div>

            {cantPay && error !== "credits" && (
              <p className="text-sm text-slate-300">
                {t("noCredits")}{" "}
                <Link href="/credits" className="font-medium text-amber-400 hover:text-amber-300">
                  {t("buyCredits")} &rarr;
                </Link>
              </p>
            )}

            {error && (
              <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-sm text-amber-200">{t(`errors.${error}`, { limit: FOLLOWUP_LIMIT })}</p>
                {error === "credits" && (
                  <Link href="/credits" className="mt-2 inline-block text-sm font-medium text-amber-400 hover:text-amber-300">
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
      </CardContent>
    </Card>
  );
}
