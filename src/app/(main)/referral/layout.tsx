import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refer Friends | Arcana",
  description: "Invite friends to Arcana and earn free credits for tarot readings",
};

export default function ReferralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
