import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Header, Footer } from "@/components/layout";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { ReadingCounter, DailyCardPreview, Testimonials } from "@/components/landing";

export default async function Home() {
  const t = await getTranslations("landing");
  const tSpreads = await getTranslations("spreads");
  const locale = await getLocale();

  const features = [
    {
      icon: "&#9733;",
      title: t("features.cards.title"),
      description: t("features.cards.description"),
    },
    {
      icon: "&#9788;",
      title: t("features.spreads.title"),
      description: t("features.spreads.description"),
    },
    {
      icon: "&#10023;",
      title: t("features.ai.title"),
      description: t("features.ai.description"),
    },
  ];

  const howItWorks = [
    {
      step: 1,
      icon: "&#127183;",
      title: t("howItWorks.step1.title"),
      description: t("howItWorks.step1.description"),
    },
    {
      step: 2,
      icon: "&#128161;",
      title: t("howItWorks.step2.title"),
      description: t("howItWorks.step2.description"),
    },
    {
      step: 3,
      icon: "&#10022;",
      title: t("howItWorks.step3.title"),
      description: t("howItWorks.step3.description"),
    },
    {
      step: 4,
      icon: "&#9728;",
      title: t("howItWorks.step4.title"),
      description: t("howItWorks.step4.description"),
    },
  ];

  const faqs = [
    {
      question: t("faq.q1"),
      answer: t("faq.a1"),
    },
    {
      question: t("faq.q2"),
      answer: t("faq.a2"),
    },
    {
      question: t("faq.q3"),
      answer: t("faq.a3"),
    },
  ];

  const testimonials = [
    {
      name: t("testimonials.t1.name"),
      text: t("testimonials.t1.text"),
      rating: 5,
    },
    {
      name: t("testimonials.t2.name"),
      text: t("testimonials.t2.text"),
      rating: 5,
    },
    {
      name: t("testimonials.t3.name"),
      text: t("testimonials.t3.text"),
      rating: 5,
    },
  ];

  const spreads = [
    {
      name: tSpreads("threeCard.name"),
      cards: 3,
      description: tSpreads("threeCard.description"),
    },
    {
      name: tSpreads("simpleCross.name"),
      cards: 5,
      description: tSpreads("simpleCross.description"),
    },
    {
      name: tSpreads("horseshoe.name"),
      cards: 7,
      description: tSpreads("horseshoe.description"),
    },
    {
      name: tSpreads("celticCross.name"),
      cards: 10,
      description: tSpreads("celticCross.description"),
    },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 text-6xl text-purple-500/20 animate-float">
            &#9790;
          </div>
          <div
            className="absolute top-40 right-20 text-4xl text-amber-500/20 animate-float"
            style={{ animationDelay: "1s" }}
          >
            &#9733;
          </div>
          <div
            className="absolute bottom-20 left-1/4 text-5xl text-purple-500/10 animate-float"
            style={{ animationDelay: "2s" }}
          >
            &#10017;
          </div>

          <div className="container mx-auto px-4 text-center relative">
            <div className="max-w-3xl mx-auto">
              {/* Main heading */}
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-purple-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
                  {t("hero.title")}
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-400 mb-8 leading-relaxed">
                {t("hero.subtitle")}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/reading/new">
                  <Button size="lg" className="text-base px-8">
                    {t("hero.cta")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="secondary" size="lg" className="text-base px-8">
                    {t("hero.ctaSecondary")}
                  </Button>
                </Link>
              </div>

              {/* Trust badge */}
              <p className="mt-6 text-sm text-slate-500">
                {t("hero.trustBadge")}
              </p>
            </div>

            {/* Decorative cards */}
            <div className="mt-16 flex justify-center items-end gap-4">
              <div className="hidden md:block w-24 h-36 bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg border border-purple-500/20 transform -rotate-12 translate-y-4 shadow-xl shadow-purple-500/10">
                <div className="h-full flex items-center justify-center text-3xl text-purple-400/50">
                  &#9789;
                </div>
              </div>
              <div className="w-28 h-40 bg-gradient-to-br from-amber-900/50 to-amber-800/30 rounded-lg border border-amber-500/30 shadow-xl shadow-amber-500/10 transform hover:scale-105 transition-transform">
                <div className="h-full flex items-center justify-center text-4xl text-amber-400/70">
                  &#9788;
                </div>
              </div>
              <div className="hidden md:block w-24 h-36 bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg border border-purple-500/20 transform rotate-12 translate-y-4 shadow-xl shadow-purple-500/10">
                <div className="h-full flex items-center justify-center text-3xl text-purple-400/50">
                  &#9733;
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reading Counter */}
        <section className="py-8 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <ReadingCounter label={t("readingCounter")} />
          </div>
        </section>

        {/* Daily Card Preview (for non-logged users) */}
        <section className="py-16 border-t border-slate-800/50 bg-gradient-to-b from-purple-950/20 to-transparent">
          <div className="container mx-auto px-4">
            <DailyCardPreview
              title={t("dailyCard.title")}
              ctaText={t("dailyCard.cta")}
              locale={locale}
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 border-t border-slate-800/50 bg-gradient-to-b from-transparent to-purple-950/10">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                {t("howItWorks.title")}
              </span>
            </h2>
            <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {howItWorks.map((item) => (
                <div key={item.step} className="relative">
                  {/* Connector line (hidden on mobile) */}
                  {item.step < 4 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-purple-500/30 to-transparent z-0" />
                  )}

                  <Card className="relative z-10 text-center p-6 h-full">
                    {/* Step number */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </div>

                    {/* Icon */}
                    <div
                      className="text-5xl mb-4 mt-2 text-amber-400"
                      dangerouslySetInnerHTML={{ __html: item.icon }}
                    />

                    <h3 className="text-lg font-semibold text-slate-100 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                {t("features.title")}
              </span>
            </h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <Card key={index} variant="interactive" className="text-center p-8">
                  <div
                    className="text-4xl mb-4 text-amber-400"
                    dangerouslySetInnerHTML={{ __html: feature.icon }}
                  />
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Spreads Preview */}
        <section className="py-20 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                {t("spreadsSection.title")}
              </span>
            </h2>
            <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
              {t("spreadsSection.subtitle")}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {spreads.map((spread, index) => (
                <Card key={index} variant="interactive">
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center gap-1 mb-4">
                      {Array.from({ length: Math.min(spread.cards, 5) }).map(
                        (_, i) => (
                          <div
                            key={i}
                            className="w-6 h-9 bg-gradient-to-b from-purple-800/50 to-purple-900/50 rounded border border-purple-500/30"
                          />
                        )
                      )}
                      {spread.cards > 5 && (
                        <span className="text-slate-500 text-sm self-end">
                          +{spread.cards - 5}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-100">{spread.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {spread.description}
                    </p>
                    <p className="text-xs text-amber-400/70 mt-2">
                      {spread.cards} {spread.cards === 1 ? "carta" : "cartas"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/reading/new">
                <Button variant="secondary">{t("spreadsSection.viewAll")}</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Daily Oracle Section */}
        <section className="py-20 border-t border-slate-800/50 bg-gradient-to-b from-purple-950/20 to-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge variant="primary" className="mb-4">&#10024; {t("dailyOracle.badge")}</Badge>
                  <h2 className="text-3xl font-bold text-slate-100 mb-4">
                    {t("dailyOracle.title")}
                  </h2>
                  <p className="text-slate-400 mb-6">
                    {t("dailyOracle.description")}
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-slate-300">
                      <span className="text-amber-400">&#10003;</span>
                      {t("dailyOracle.feature1")}
                    </li>
                    <li className="flex items-center gap-3 text-slate-300">
                      <span className="text-amber-400">&#10003;</span>
                      {t("dailyOracle.feature2")}
                    </li>
                    <li className="flex items-center gap-3 text-slate-300">
                      <span className="text-amber-400">&#10003;</span>
                      {t("dailyOracle.feature3")}
                    </li>
                  </ul>
                  <div className="flex items-center gap-4">
                    <Link href="/subscribe">
                      <Button size="lg">{t("dailyOracle.cta")}</Button>
                    </Link>
                    <span className="text-2xl font-bold text-amber-400">$3.99/mo</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-amber-500 blur-3xl opacity-20" />
                    <Card className="relative p-6 text-center">
                      <div className="text-6xl mb-4">&#128231;</div>
                      <p className="text-slate-300 mb-2">{t("dailyOracle.emailPreview")}</p>
                      <p className="text-sm text-slate-500">{t("dailyOracle.emailTime")}</p>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <Testimonials
              title={t("testimonials.title")}
              testimonials={testimonials}
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 border-t border-slate-800/50 bg-gradient-to-b from-transparent to-slate-900/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                {t("faq.title")}
              </span>
            </h2>
            <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
              {t("faq.subtitle")}
            </p>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="overflow-hidden">
                  <details className="group">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                      <h3 className="font-medium text-slate-100 pr-4">
                        {faq.question}
                      </h3>
                      <span className="text-purple-400 transition-transform group-open:rotate-180">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <Card
              variant="highlighted"
              className="max-w-3xl mx-auto text-center p-12"
            >
              <h2 className="text-3xl font-bold mb-4 text-slate-100">
                {t("cta.title")}
              </h2>
              <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                {t("cta.subtitle")}
              </p>
              <Link href="/register">
                <Button size="lg" className="px-10">
                  {t("cta.button")}
                </Button>
              </Link>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
