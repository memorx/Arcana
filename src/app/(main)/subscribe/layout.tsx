import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Oracle Subscription",
  description:
    "Subscribe to the Daily Oracle and receive personalized tarot guidance every day. Get a free reading each month included.",
  openGraph: {
    title: "Subscribe to Daily Oracle | Arcana",
    description:
      "Get daily personalized tarot readings delivered to your inbox.",
  },
};

export default function SubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
