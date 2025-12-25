import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Complete your profile to personalize your tarot readings based on your zodiac sign and preferences.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
