import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buy Credits",
  description:
    "Purchase credits for tarot readings. Choose from different packages to unlock personalized AI-powered readings.",
  openGraph: {
    title: "Buy Credits | Arcana",
    description: "Purchase credits for personalized tarot readings.",
  },
};

export default function CreditsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
