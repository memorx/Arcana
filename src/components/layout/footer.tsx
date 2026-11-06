import Link from "next/link";
import { useTranslations } from "next-intl";

const ENLACE =
  "inline-flex min-h-11 items-center font-dato text-[0.6875rem] tracking-[0.1em] text-niebla uppercase transition-colors hover:text-papel";

/** Pie en tinta, como el cierre del pliego: marca, enlaces y el crédito de las cartas. */
export function Footer() {
  const t = useTranslations("footer");
  const tCommon = useTranslations("common");

  return (
    <footer className="suelo-tinta mt-auto">
      <div className="mx-auto grid max-w-escena gap-8 px-gutter pt-12 pb-[calc(env(safe-area-inset-bottom,0px)+28px)]">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="grid gap-2">
            <span className="font-titulo text-[1.9rem] leading-none text-papel">Arcana</span>
            <p className="max-w-[34ch] text-base leading-snug text-niebla italic">{t("tagline")}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-0">
            <Link href="/cards" className={ENLACE}>
              {t("explore")}
            </Link>
            <Link href="/blog" className={ENLACE}>
              {t("blog")}
            </Link>
            <Link href="/subscribe" className={ENLACE}>
              {t("dailyOracle")}
            </Link>
            <Link href="/about" className={ENLACE}>
              {t("legal.about")}
            </Link>
            <Link href="/privacy" className={ENLACE}>
              {t("legal.privacy")}
            </Link>
            <Link href="/terms" className={ENLACE}>
              {t("legal.terms")}
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap justify-between gap-x-7 gap-y-2 border-t border-papel/18 pt-5 font-dato text-[0.6875rem] leading-[1.6] tracking-[0.08em] text-niebla uppercase">
          <span>&copy; {new Date().getFullYear()} Arcana · readarcana.com</span>
          <span>{tCommon("cardsCredit")}</span>
        </div>
      </div>
    </footer>
  );
}
