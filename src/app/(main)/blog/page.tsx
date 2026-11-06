import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { MEDIDAS_CARTA } from "@/lib/cartas";
import { grabadoDelArticulo } from "./contenido";

export const metadata = {
  title: "Blog - Tarot Insights & Guides",
  description: "Learn about tarot reading, card meanings, and spiritual guidance through our educational blog posts.",
};

export default async function BlogPage() {
  const t = await getTranslations("blog");
  const locale = await getLocale();

  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="grid gap-[clamp(40px,7vh,64px)]">
      {/* Encabezado */}
      <header className="grid max-w-[760px] gap-3.5">
        <Etiqueta>{t("eyebrow")}</Etiqueta>
        <h1 className="text-[clamp(2.2rem,1.5rem+2.4vw,3.6rem)] leading-[1.04]">{t("title")}</h1>
        <p className="max-w-[52ch] text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] text-grafito">{t("subtitle")}</p>
      </header>

      {/* Índice editorial: filetes, número de entrada en mono, el grabado de cada artículo */}
      {posts.length === 0 ? (
        <p className="border-y border-tinta py-12 text-center text-grafito">{t("noPosts")}</p>
      ) : (
        <ol className="border-t border-tinta">
          {posts.map((post, i) => {
            const title = locale === "en" ? post.title : post.titleEs;
            const excerpt = locale === "en" ? post.excerpt : post.excerptEs;

            return (
              <li
                key={post.id}
                className="group relative flex items-start gap-[clamp(16px,4vw,48px)] border-b border-tinta/25 py-[clamp(24px,4vw,36px)]"
              >
                <div className="grid min-w-0 flex-1 gap-3">
                  <p className="font-dato text-xs leading-[1.4] tracking-[0.12em] text-grafito uppercase">
                    <span aria-hidden="true" className="mr-3 text-rosa-texto">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {t("article")}
                    {post.publishedAt && (
                      <>
                        {" · "}
                        <time dateTime={post.publishedAt.toISOString()}>
                          {new Date(post.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      </>
                    )}
                  </p>

                  <h2 className="max-w-[30ch] text-[clamp(1.45rem,1.15rem+1.1vw,2.1rem)] leading-[1.12]">
                    {/* Toda la fila es clicable; el nombre accesible del enlace es sólo el título */}
                    <Link
                      href={`/blog/${post.slug}`}
                      className="decoration-rosa decoration-1 underline-offset-[0.18em] after:absolute after:inset-0 after:z-10 group-hover:underline"
                    >
                      {title}
                    </Link>
                  </h2>

                  <p className="line-clamp-3 max-w-[60ch] text-grafito">{excerpt}</p>

                  <p aria-hidden="true" className="font-dato text-[0.6875rem] tracking-[0.12em] text-rosa-texto uppercase">
                    {t("readMore")} →
                  </p>
                </div>

                {/* Portada del post si la tiene; si no, su grabado en tinta (decorativo) */}
                <div className="w-[72px] shrink-0 sm:w-[104px] md:w-[132px]">
                  {post.coverImage ? (
                    <div className="relative aspect-[7/12] w-full overflow-hidden border border-tinta/20">
                      <Image src={post.coverImage} alt="" fill sizes="132px" className="object-cover" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada y ya optimizada (scripts/cartas.py)
                    <img
                      src={grabadoDelArticulo(post.slug)}
                      alt=""
                      width={MEDIDAS_CARTA.tinta.width}
                      height={MEDIDAS_CARTA.tinta.height}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full rounded-[3px] mix-blend-multiply transition-transform duration-500 ease-tinta motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:-rotate-1"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
