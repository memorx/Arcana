import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button, Card, CardContent } from "@/components/ui";
import { claimBirthdayGift, type BirthdayGiftResult } from "@/lib/birthday";

interface BirthdayBannerProps {
  userId: string;
}

/**
 * Dashboard greeting on the person's birthday. Claims the yearly gift while
 * rendering (idempotent) and renders nothing the rest of the year.
 */
export async function BirthdayBanner({ userId }: BirthdayBannerProps) {
  let result: BirthdayGiftResult;
  try {
    result = await claimBirthdayGift(userId);
  } catch (error) {
    console.error("[birthday] Could not claim the birthday gift:", error);
    return null;
  }

  if (!result.granted && !result.isBirthday) return null;

  const t = await getTranslations("birthday");

  return (
    <Card
      variant="highlighted"
      className="relative overflow-hidden border-amber-400/40 bg-gradient-to-r from-amber-900/30 via-purple-900/30 to-amber-900/20"
    >
      <section aria-labelledby="birthday-banner-title">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 -top-3 text-7xl text-amber-400/10 select-none"
        >
          &#10022;
        </span>
        <CardContent className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <span
            aria-hidden="true"
            className="text-5xl leading-none motion-safe:animate-[float_6s_ease-in-out_infinite]"
          >
            🎂
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="birthday-banner-title" className="text-xl font-semibold text-amber-300">
              {t("title")}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              {result.granted
                ? t("granted", { credits: result.credits })
                : t("alreadyGranted", { credits: result.credits })}
            </p>
          </div>
          <Link href="/reading/new" className="sm:shrink-0">
            <Button size="sm" className="w-full sm:w-auto">
              {t("cta")}
            </Button>
          </Link>
        </CardContent>
      </section>
    </Card>
  );
}
