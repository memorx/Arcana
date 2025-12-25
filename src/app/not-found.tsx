import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <div className="text-center px-4">
        <div className="text-8xl mb-6">&#127183;</div>
        <h1 className="text-4xl font-bold text-slate-100 mb-4">
          {t("notFound.title")}
        </h1>
        <p className="text-slate-400 mb-8">{t("notFound.message")}</p>
        <Link href="/">
          <Button size="lg">{t("notFound.goHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
