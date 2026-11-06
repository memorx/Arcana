import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui";
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
    <section
      aria-labelledby="birthday-banner-title"
      className="flex flex-col gap-4 border-y border-filete border-t-[3px] border-t-rosa py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h2 id="birthday-banner-title" className="font-titulo text-2xl leading-tight text-letra">
          {t("title")}
        </h2>
        <p className="mt-1 max-w-[60ch] font-lectura text-letra-suave">
          {result.granted
            ? t("granted", { credits: result.credits })
            : result.alreadyGranted
              ? t("alreadyGranted", { credits: result.credits })
              : t("greetingOnly")}
        </p>
      </div>
      <Link href="/reading/new" className={buttonClasses({ size: "sm", className: "self-start sm:shrink-0 sm:self-auto" })}>
        {t("cta")}
      </Link>
    </section>
  );
}
