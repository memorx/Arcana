import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { buttonClasses } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { ContenidoArticulo, ImagenDelArticulo } from "../contenido";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });

  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("blog");
  const locale = await getLocale();

  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });

  if (!post) {
    notFound();
  }

  const title = locale === "en" ? post.title : post.titleEs;
  const excerpt = locale === "en" ? post.excerpt : post.excerptEs;
  const content = locale === "en" ? post.content : post.contentEs;

  return (
    <article className="grid gap-[clamp(32px,6vh,56px)]">
      {/* Volver */}
      <Link
        href="/blog"
        className="inline-flex min-h-11 items-center gap-2 justify-self-start font-dato text-[0.6875rem] tracking-[0.12em] text-grafito uppercase transition-colors hover:text-tinta"
      >
        <span aria-hidden="true">←</span>
        {t("backToBlog")}
      </Link>

      {/* Cabecera del artículo */}
      <header className="grid items-end gap-x-12 gap-y-8 border-b border-tinta pb-[clamp(28px,5vh,48px)] md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid max-w-[760px] gap-4">
          <Etiqueta>
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
          </Etiqueta>
          <h1 className="text-[clamp(2.2rem,1.5rem+2.4vw,3.6rem)] leading-[1.04]">{title}</h1>
          {excerpt && (
            <p className="max-w-[46ch] border-l-2 border-rosa pl-[18px] text-[clamp(1.15rem,1rem+0.5vw,1.4rem)] leading-[1.45] italic">
              {excerpt}
            </p>
          )}
        </div>
        {/* Portada del post si la tiene; si no, su grabado en tinta (decorativo). La misma regla que el índice. */}
        <div className="hidden w-[150px] rotate-[2deg] md:block lg:w-[176px]">
          <ImagenDelArticulo
            slug={post.slug}
            portada={post.coverImage}
            sizes="176px"
            claseGrabado="rounded-[4px] mix-blend-multiply"
          />
        </div>
      </header>

      {/* Cuerpo: Newsreader a ~66 caracteres; el «# » del Markdown baja a h2 */}
      <ContenidoArticulo texto={content} titulo={title} />

      {/* Llamado final */}
      <section
        aria-labelledby="blog-cta-titulo"
        className="grid max-w-[66ch] gap-4 border border-tinta/80 border-t-[3px] border-t-rosa bg-papel-hondo/50 p-[clamp(20px,4vw,36px)]"
      >
        <h2 id="blog-cta-titulo" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.12]">
          {t("ctaTitle")}
        </h2>
        <p className="text-grafito">{t("ctaDescription")}</p>
        <div>
          <Link href="/register" className={buttonClasses({ size: "lg" })}>
            {t("ctaButton")}
          </Link>
        </div>
      </section>
    </article>
  );
}
