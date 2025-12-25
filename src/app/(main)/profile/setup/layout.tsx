import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Profile | Arcana",
  description: "Complete your profile for personalized tarot readings",
};

export default function ProfileSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
