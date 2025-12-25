import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buy Credits | Arcana",
  description: "Purchase credits to unlock tarot readings and spiritual guidance",
};

export default function CreditsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
