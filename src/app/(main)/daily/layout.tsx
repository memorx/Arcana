import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Oracle | Arcana",
  description: "Get your personalized daily tarot card reading based on your zodiac sign",
};

export default function DailyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
