import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default async function PrivacyPage() {
  const t = await getTranslations("legal.privacy");

  const sections = [
    { key: "collection" },
    { key: "use" },
    { key: "storage" },
    { key: "sharing" },
    { key: "cookies" },
    { key: "rights" },
    { key: "contact" },
  ];

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
            <CardTitle className="text-3xl text-center">{t("title")}</CardTitle>
            <p className="text-slate-500 text-sm text-center mt-2">
              {t("lastUpdated")}
            </p>
          </CardHeader>
          <CardContent className="prose prose-invert prose-slate max-w-none">
            <p className="text-lg text-slate-300 mb-8">{t("intro")}</p>

            {sections.map((section) => (
              <section key={section.key} className="mb-8">
                <h2 className="text-xl font-semibold text-slate-100 mb-3">
                  {t(`${section.key}.title`)}
                </h2>
                <p className="text-slate-400">{t(`${section.key}.content`)}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
