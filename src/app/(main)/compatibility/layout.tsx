import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compatibility");
  return {
    // The root layout adds " | Arcana"
    title: t("title"),
    description: t("metaDescription"),
  };
}

export default function CompatibilityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
