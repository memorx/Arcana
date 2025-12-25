import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, Badge } from "@/components/ui";

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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-100 mb-4">
          {t("title")}
        </h1>
        <p className="text-slate-400 text-lg">
          {t("subtitle")}
        </p>
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-400">{t("noPosts")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => {
            const title = locale === "en" ? post.title : post.titleEs;
            const excerpt = locale === "en" ? post.excerpt : post.excerptEs;

            return (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card variant="interactive" className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Cover Image */}
                    <div className="md:w-1/3 h-48 md:h-auto relative bg-gradient-to-br from-purple-900/50 to-slate-900 flex items-center justify-center">
                      {post.coverImage ? (
                        <Image
                          src={post.coverImage}
                          alt={title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="text-6xl text-purple-500/30">&#9788;</div>
                      )}
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="primary">{t("article")}</Badge>
                        {post.publishedAt && (
                          <span className="text-xs text-slate-500">
                            {new Date(post.publishedAt).toLocaleDateString(
                              locale === "en" ? "en-US" : "es-ES",
                              { month: "long", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-semibold text-slate-100 mb-2 group-hover:text-purple-400 transition-colors">
                        {title}
                      </h2>

                      <p className="text-slate-400 line-clamp-3">
                        {excerpt}
                      </p>

                      <div className="mt-4 text-purple-400 text-sm font-medium flex items-center gap-1">
                        {t("readMore")}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
