"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, buttonClasses } from "@/components/ui";
import { ReversoCarta } from "@/components/tinta/ReversoCarta";

/**
 * Error de una pantalla, en dos tintas: suelo de tinta, letra papel, el rosa sólo en el botón y en los
 * reversos cruzados (decorativos: «las cartas se confundieron»). Va sin la cabecera de la app a propósito:
 * si el error vino de ella, no debe volver a romperse aquí.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="suelo-tinta flex w-full flex-1 items-center">
      <div className="mx-auto grid w-full max-w-pliego items-center gap-[clamp(48px,8vw,112px)] px-gutter py-[clamp(48px,10vh,120px)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid justify-items-start gap-5">
          <Link href="/" className="inline-flex min-h-11 items-center font-titulo text-[1.45rem] leading-none text-papel">
            Arcana
          </Link>
          <h1 className="max-w-[18ch] text-[clamp(2rem,1.4rem+2.2vw,3.4rem)] leading-[1.06] text-papel">
            {t("errorPage.title")}
          </h1>
          <p className="max-w-[46ch] text-[1.125rem] text-niebla">{t("errorPage.message")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => reset()}>
              {t("errorPage.tryAgain")}
            </Button>
            <Link href="/" className={buttonClasses({ variant: "linea", size: "lg" })}>
              {t("errorPage.goHome")}
            </Link>
          </div>
        </div>

        {/* Dos reversos cruzados, como la Cruz Simple */}
        <div aria-hidden="true" className="relative mx-auto w-[min(150px,40vw)] md:order-first md:w-[min(170px,100%)] lg:w-[200px]">
          <ReversoCarta className="block h-auto w-full rounded-[12px]" />
          <ReversoCarta className="absolute top-1/2 left-1/2 h-auto w-full -translate-x-1/2 -translate-y-1/2 rotate-[78deg] rounded-[12px] shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)]" />
        </div>
      </div>
    </main>
  );
}
