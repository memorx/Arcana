import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe to Daily Oracle | Arcana",
  description: "Subscribe to receive personalized daily tarot readings delivered to your inbox",
};

export default function SubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
