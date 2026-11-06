import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { ReversoCarta } from "@/components/tinta/ReversoCarta";
import { LaminaTirada } from "@/components/reading/LaminaTirada";

type Posicion = { position: number; name: string; nameEs: string; description: string };

export default async function NewReadingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/reading/new");
  }

  const t = await getTranslations("reading");
  const tManual = await getTranslations("manual");
  const locale = await getLocale();

  const [user, spreadTypes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { freeReadingsLeft: true, credits: true },
    }),
    prisma.spreadType.findMany({
      orderBy: { cardCount: "asc" },
    }),
  ]);

  const freeReadingsLeft = user?.freeReadingsLeft || 0;
  const credits = user?.credits || 0;

  const categorias = [
    { clave: "classic", titulo: t("spreadCategories.classic") },
    { clave: "themed", titulo: t("spreadCategories.themed") },
  ] as const;

  return (
    <div className="grid gap-12 sm:gap-16">
      {/* Encabezado: la mesa y lo que te queda para tirar */}
      <header className="grid max-w-[760px] gap-4">
        <h1 className="font-titulo text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("selectSpread")}</h1>
        <p className="max-w-[52ch] text-letra-suave">{t("selectSpreadSubtitle")}</p>

        <div className="flex flex-wrap items-center gap-2">
          {freeReadingsLeft > 0 && (
            <Badge variant="success">
              {freeReadingsLeft} {freeReadingsLeft !== 1 ? t("freeReadingsLabel") : t("freeReadingLabel")}
            </Badge>
          )}
          <Badge variant="secondary">
            {credits} {t("creditsAvailableLabel")}
          </Badge>
        </div>
      </header>

      {/* Tu propio mazo */}
      <Link
        href="/reading/manual"
        className="group grid items-center gap-5 border-y border-filete/25 py-6 outline-offset-[-3px] transition-colors duration-300 ease-tinta hover:bg-papel-hondo sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-8 sm:px-6"
      >
        <span aria-hidden="true" className="flex shrink-0 items-end pl-1">
          {[-9, 0, 9].map((angulo, i) => (
            <span
              key={angulo}
              className="block w-9 overflow-hidden rounded-[4px] shadow-[0_10px_18px_-12px_rgb(0_0_0/0.6)] transition-transform duration-300 ease-tinta group-hover:-translate-y-1 motion-reduce:group-hover:translate-y-0"
              style={{ transform: `rotate(${angulo}deg)`, marginLeft: i === 0 ? 0 : -10 }}
            >
              <ReversoCarta />
            </span>
          ))}
        </span>
        <span className="grid gap-1.5">
          <span className="font-titulo text-[1.5rem] leading-[1.1]">{tManual("entryTitle")}</span>
          <span className="max-w-[60ch] text-[0.9375rem] leading-[1.5] text-letra-suave">{tManual("entryDescription")}</span>
        </span>
        <span className="font-dato text-xs font-medium tracking-[0.1em] text-letra-acento uppercase">
          {tManual("entryCta")} <span aria-hidden="true">→</span>
        </span>
      </Link>

      {/* Las tiradas, como láminas en la mesa */}
      {categorias.map(({ clave, titulo }) => {
        const tiradas = spreadTypes.filter((s) => s.category === clave);
        if (tiradas.length === 0) return null;
        return (
          <section key={clave} aria-labelledby={`tiradas-${clave}`} className="grid gap-5">
            <Etiqueta as="h2" id={`tiradas-${clave}`}>
              {titulo}
            </Etiqueta>
            <div className="grid grid-cols-1 border-t border-l border-filete/25 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
              {tiradas.map((spread) => {
                const canAfford = freeReadingsLeft > 0 || credits >= spread.creditCost;
                const positions = (Array.isArray(spread.positions) ? spread.positions : []) as Posicion[];
                const nombres = positions.map((pos) => (locale === "en" ? pos.name : pos.nameEs));

                return (
                  <LaminaTirada
                    key={spread.id}
                    href={canAfford ? `/reading/new/${spread.id}` : null}
                    nombre={locale === "en" ? spread.name : spread.nameEs}
                    nombreIngles={spread.name}
                    descripcion={locale === "en" ? spread.description : spread.descriptionEs}
                    total={spread.cardCount}
                    totalTexto={t("cards", { count: spread.cardCount })}
                    costo={
                      freeReadingsLeft > 0
                        ? t("free")
                        : spread.creditCost !== 1
                          ? t("costPlural", { count: spread.creditCost })
                          : t("cost", { count: spread.creditCost })
                    }
                    posicionesTitulo={t("positions")}
                    posiciones={nombres.slice(0, 5)}
                    masTexto={nombres.length > 5 ? t("more", { count: nombres.length - 5 }) : undefined}
                    faltaTexto={canAfford ? undefined : t("needMoreCredits", { count: spread.creditCost - credits })}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Comprar créditos */}
      {freeReadingsLeft === 0 && credits < 3 && (
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t-[3px] border-rosa pt-5">
          <span>{t("buyCreditsQuestion")}</span>
          <Link
            href="/credits"
            className="inline-flex min-h-11 items-center font-dato text-xs font-medium tracking-[0.1em] text-letra-acento uppercase underline-offset-[0.3em] hover:underline"
          >
            {t("buyCreditsLink")} <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </p>
      )}
    </div>
  );
}
