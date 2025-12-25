import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Oracle",
  description:
    "Your personalized daily tarot card. Receive guidance based on your zodiac sign and life focus every day.",
  openGraph: {
    title: "Daily Oracle | Arcana",
    description:
      "Get your personalized daily tarot card with AI-powered interpretations.",
  },
};

export default function DailyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
