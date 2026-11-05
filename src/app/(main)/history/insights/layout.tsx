import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("insights");
  return {
    title: `${t("metaTitle")} | Arcana`,
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
