import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header, Footer } from "@/components/layout";
import { buttonClasses } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { ReversoCarta } from "@/components/tinta/ReversoCarta";

/**
 * 404 · «la carta perdida»: sobre papel, el hueco punteado donde iba la carta y su reverso salido del mazo
 * (decorativo), el mensaje como único h1 y el enlace a inicio. Se renderiza bajo el layout raíz (sin el de
 * la app), así que trae su propia cabecera y pie. Componente de servidor: sin JS se ve completo.
 */
export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <>
      <Header />
      <main id="main-content" className="flex w-full flex-1 items-center">
        <div className="mx-auto grid w-full max-w-pliego items-center gap-[clamp(48px,8vw,112px)] px-gutter py-[clamp(48px,10vh,120px)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* La carta perdida */}
          <div aria-hidden="true" className="relative mx-auto w-[min(180px,46vw)] md:w-[min(260px,100%)]">
            <div className="aspect-[300/520] w-full rounded-[14px] border-2 border-dashed border-tinta/35" />
            <ReversoCarta className="absolute inset-0 h-full w-full translate-x-[16%] translate-y-[5%] rotate-[8deg] rounded-[14px] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]" />
          </div>

          <div className="grid justify-items-start gap-5">
            <Etiqueta>{t("notFound.title")}</Etiqueta>
            <h1 className="max-w-[18ch] text-[clamp(2rem,1.4rem+2.2vw,3.4rem)] leading-[1.06]">
              {t("notFound.message")}
            </h1>
            <Link href="/" className={buttonClasses({ size: "lg", className: "mt-2" })}>
              {t("notFound.goHome")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
