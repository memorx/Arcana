import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.meta");
  // The root layout adds " | Arcana" (the old fixed title said it twice).
  return { title: t("title"), description: t("description") };
}

export default function ProfileSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
