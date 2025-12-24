import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default async function AboutPage() {
  const t = await getTranslations("legal.about");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="text-slate-400 hover:text-slate-300 text-sm mb-8 inline-flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>

        <Card>
          <CardHeader>
            <div className="text-4xl mb-4 text-center">&#9788;</div>
            <CardTitle className="text-3xl text-center">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert prose-slate max-w-none">
            <p className="text-lg text-slate-300 text-center mb-8">
              {t("intro")}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-100 mb-3">
                {t("mission.title")}
              </h2>
              <p className="text-slate-400">{t("mission.content")}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-100 mb-3">
                {t("how.title")}
              </h2>
              <p className="text-slate-400">{t("how.content")}</p>
            </section>

            <section className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h2 className="text-xl font-semibold text-amber-400 mb-3">
                {t("disclaimer.title")}
              </h2>
              <p className="text-slate-400">{t("disclaimer.content")}</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
