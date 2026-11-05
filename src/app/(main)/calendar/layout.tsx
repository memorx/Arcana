import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/calendar" },
  };
}

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
