import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refer Friends",
  description:
    "Share Arcana with friends and earn free credits. Both you and your friends get 3 credits when they sign up.",
  openGraph: {
    title: "Refer Friends | Arcana",
    description: "Invite friends to Arcana and both earn free credits.",
  },
};

export default function ReferralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
