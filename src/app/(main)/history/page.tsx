import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { ReversoCarta } from "@/components/tinta/ReversoCarta";
import { Abanico } from "@/components/dashboard/Abanico";
import { EnlaceBoton } from "@/components/dashboard/EnlaceBoton";
import { Glifo } from "@/components/dashboard/Glifos";
import { cartasDeLectura, nombresDeCartas } from "@/components/dashboard/mesa";

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/history");
  }

  const t = await getTranslations("history");
  const tInsights = await getTranslations("insights");
  const tResonance = await getTranslations("resonance");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-ES";

  const readings = await prisma.reading.findMany({
    where: { userId: session.user.id },
    include: { spreadType: true },
    orderBy: { createdAt: "desc" },
  });

  // English names of the cards, for the small engravings of each reading
  const nombres = await nombresDeCartas(readings);

  // Group readings by month
  const groupedReadings = readings.reduce(
    (acc, reading) => {
      const date = new Date(reading.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString(dateLocale, {
        month: "long",
        year: "numeric",
      });

      if (!acc[key]) {
        acc[key] = { label, readings: [] };
      }
      acc[key].readings.push(reading);
      return acc;
    },
    {} as Record<
      string,
      { label: string; readings: typeof readings }
    >
  );

  return (
    <div>
      {/* Header */}
      <header className="mb-10 grid gap-6 border-b border-filete pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-3">
          <Etiqueta>{t("etiqueta")}</Etiqueta>
          <h1 className="font-titulo text-[clamp(2.2rem,1.4rem+2.6vw,3.6rem)] leading-[1.05] text-letra">{t("title")}</h1>
          <p className="font-dato text-xs uppercase tracking-[0.1em] text-letra-suave">
            {readings.length} {readings.length === 1 ? t("readingTotal") : t("readingsTotal")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <EnlaceBoton href="/history/insights" variant="linea">
            <Glifo nombre="history" className="-my-2 size-7" />
            {tInsights("myStory")}
          </EnlaceBoton>
          <EnlaceBoton href="/reading/new">{t("newReading")}</EnlaceBoton>
        </div>
      </header>

      {/* Readings List */}
      {readings.length === 0 ? (
        <section
          aria-labelledby="historial-vacio"
          className="grid justify-items-start gap-6 border-b border-filete pb-10 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10"
        >
          <span className="block aspect-[300/520] w-24 overflow-hidden rounded-[8px] shadow-[0_18px_36px_-24px_rgb(0_0_0/.6)]">
            <ReversoCarta />
          </span>
          <div>
            <h2 id="historial-vacio" className="font-titulo text-2xl leading-tight text-letra sm:text-3xl">
              {t("emptyTitle")}
            </h2>
            <p className="mt-2 max-w-[48ch] font-lectura text-lg text-letra-suave">{t("emptySubtitle")}</p>
            <EnlaceBoton href="/reading/new" className="mt-6">
              {t("startReading")}
            </EnlaceBoton>
          </div>
        </section>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedReadings).map(([key, group]) => (
            <section key={key} aria-labelledby={`historial-${key}`}>
              <div className="flex items-baseline justify-between gap-4 border-b border-filete pb-2">
                <h2 id={`historial-${key}`} className="font-titulo text-2xl leading-tight text-letra first-letter:uppercase">
                  {group.label}
                </h2>
                <p aria-hidden="true" className="font-dato text-[0.6875rem] uppercase tracking-[0.12em] text-letra-suave">
                  {group.readings.length}
                </p>
              </div>
              <ol className="divide-y divide-filete/15">
                {group.readings.map((reading) => {
                  const spreadName = locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs;
                  const created = new Date(reading.createdAt);

                  return (
                    <li key={reading.id}>
                      <Link
                        href={`/reading/${reading.id}`}
                        className="group -mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 px-2 py-4 transition-colors hover:bg-papel-hondo sm:gap-x-6"
                      >
                        <Abanico
                          cartas={cartasDeLectura(reading.cards, nombres)}
                          vacias={reading.spreadType.cardCount}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <Badge variant="primary" className="max-w-full whitespace-normal">
                              {spreadName}
                            </Badge>
                            {reading.resonance !== null && (
                              <Badge>
                                <span aria-hidden="true" className="inline-block size-[0.55em] rounded-full bg-rosa" />
                                {tResonance("badge", { score: reading.resonance })}
                              </Badge>
                            )}
                            <time
                              dateTime={created.toISOString()}
                              className="font-dato text-[0.6875rem] tracking-[0.06em] text-letra-suave"
                            >
                              {created.toLocaleDateString(dateLocale, {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                          <p className="mt-2 line-clamp-2 font-lectura text-[1.0625rem] leading-snug text-letra">
                            {reading.intention}
                          </p>
                        </div>
                        <span
                          aria-hidden="true"
                          className="self-center font-lectura text-xl text-letra-suave transition-colors group-hover:text-letra-acento"
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
