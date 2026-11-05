import { render, screen } from "@testing-library/react";
import { buildCompatibilitySummary, CARD_ROLES, computeCompatibility, type CompatibilityCard } from "@/lib/compatibility";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async () => (key: string) => key),
  getLocale: jest.fn(async () => "es"),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} />;
  },
}));

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    compatibilityReading: { findUnique: jest.fn() },
    userProfile: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

import CompatibilityReadingPage from "@/app/(main)/compatibility/[id]/page";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const db = prisma as unknown as {
  compatibilityReading: { findUnique: jest.Mock };
  userProfile: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
};

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const cards: CompatibilityCard[] = CARD_ROLES.map((r, i) => ({
  position: i + 1,
  role: r.role,
  roleLabel: r.label,
  cardId: `major_${i}`,
  isReversed: false,
  name: ["The Magician", "The Moon", "The Lovers"][i],
  nameEs: ["El Mago", "La Luna", "Los Enamorados"][i],
  imageUrl: `/cards/${i}.jpg`,
  arcana: "MAJOR",
  suit: null,
  number: i,
}));

const stored = {
  id: "compat-1",
  userId: "owner",
  partnerName: "Ana",
  partnerBirthDate: utc(1992, 3, 3),
  locale: "es",
  content: "Cómo se encuentran\n\nAna y tú se encuentran en un lugar de calma.",
  summary: JSON.parse(
    JSON.stringify(
      buildCompatibilitySummary(
        computeCompatibility({ birthDate: utc(1990, 7, 15), fullName: "John Smith" }, { birthDate: utc(1992, 3, 3) }),
        cards
      )
    )
  ),
  createdAt: new Date("2026-11-05T12:00:00Z"),
};

const open = (id: string) => CompatibilityReadingPage({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
  db.userProfile.findUnique.mockResolvedValue({ fullName: "John Smith" });
  db.user.findUnique.mockResolvedValue({ name: "John" });
});

describe("/compatibility/[id]", () => {
  it("sends visitors without a session to login", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(open("compat-1")).rejects.toThrow("NEXT_REDIRECT /login?callbackUrl=/compatibility/compat-1");
    expect(redirect).toHaveBeenCalledWith("/login?callbackUrl=/compatibility/compat-1");
  });

  it("answers notFound() for someone else's reading", async () => {
    mockAuth.mockResolvedValue({ user: { id: "someone-else" } });
    db.compatibilityReading.findUnique.mockResolvedValue(stored);

    await expect(open("compat-1")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("answers notFound() when the reading doesn't exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "owner" } });
    db.compatibilityReading.findUnique.mockResolvedValue(null);

    await expect(open("nope")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows the owner the meters, the cards and the text", async () => {
    mockAuth.mockResolvedValue({ user: { id: "owner" } });
    db.compatibilityReading.findUnique.mockResolvedValue(stored);

    render(await open("compat-1"));

    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("detail.title");
    expect(screen.getAllByRole("meter")).toHaveLength(5);
    expect(screen.getByText("El Mago")).toBeInTheDocument();
    expect(screen.getByText("Ana y tú se encuentran en un lugar de calma.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "detail.newReading" })).toHaveAttribute("href", "/compatibility");
  });
});
