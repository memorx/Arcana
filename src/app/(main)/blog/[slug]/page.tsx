import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, Badge, Button } from "@/components/ui";

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
  const content = locale === "en" ? post.content : post.contentEs;

  // Simple markdown-like rendering (headers and paragraphs)
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={i} className="text-3xl font-bold text-slate-100 mb-6 mt-8 first:mt-0">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="text-2xl font-semibold text-slate-100 mb-4 mt-8">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="text-xl font-medium text-slate-200 mb-3 mt-6">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith("- **")) {
        const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
        if (match) {
          return (
            <li key={i} className="text-slate-300 mb-2 ml-4 list-disc">
              <strong className="text-slate-200">{match[1]}</strong>: {match[2]}
            </li>
          );
        }
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="text-slate-300 mb-2 ml-4 list-disc">
            {line.slice(2)}
          </li>
        );
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="text-slate-200 font-medium mb-2">
            {line.slice(2, -2)}
          </p>
        );
      }
      if (line.match(/^\d+\. /)) {
        return (
          <li key={i} className="text-slate-300 mb-2 ml-4 list-decimal">
            {line.replace(/^\d+\. /, "")}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={i} className="h-4" />;
      }
      return (
        <p key={i} className="text-slate-300 mb-4 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/blog"
        className="text-slate-400 hover:text-slate-300 text-sm mb-6 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("backToBlog")}
      </Link>

      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="primary">{t("article")}</Badge>
          {post.publishedAt && (
            <span className="text-sm text-slate-500">
              {new Date(post.publishedAt).toLocaleDateString(
                locale === "en" ? "en-US" : "es-ES",
                { month: "long", day: "numeric", year: "numeric" }
              )}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold text-slate-100 mb-4">{title}</h1>
      </header>

      {/* Article Content */}
      <Card>
        <CardContent className="p-8">
          <article className="prose prose-invert prose-slate max-w-none">
            {renderContent(content)}
          </article>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card variant="highlighted" className="mt-8 text-center p-8">
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          {t("ctaTitle")}
        </h3>
        <p className="text-slate-400 mb-4">
          {t("ctaDescription")}
        </p>
        <Link href="/register">
          <Button size="lg">{t("ctaButton")}</Button>
        </Link>
      </Card>
    </div>
  );
}
