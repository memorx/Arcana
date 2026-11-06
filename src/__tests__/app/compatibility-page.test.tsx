import { render, screen, within } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async () => (key: string) => key),
  getLocale: jest.fn(async () => "es"),
}));

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    userProfile: { findUnique: jest.fn() },
    compatibilityReading: { findMany: jest.fn() },
  },
}));

import CompatibilityPage from "@/app/(main)/compatibility/page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const db = prisma as unknown as {
  user: { findUnique: jest.Mock };
  userProfile: { findUnique: jest.Mock };
  compatibilityReading: { findMany: jest.Mock };
};

const lecturas = [
  {
    id: "c2",
    partnerName: "Luis",
    partnerBirthDate: new Date("1988-11-02T00:00:00Z"),
    summary: { scores: { overall: 3 } },
    createdAt: new Date("2026-11-03T12:00:00Z"),
  },
  {
    id: "c1",
    partnerName: null,
    partnerBirthDate: new Date("1995-02-14T00:00:00Z"),
    summary: null,
    createdAt: new Date("2026-10-27T12:00:00Z"),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
  db.user.findUnique.mockResolvedValue({ credits: 50 });
  db.userProfile.findUnique.mockResolvedValue({ birthDate: new Date("1990-05-17T00:00:00Z"), fullName: "Ana López" });
  db.compatibilityReading.findMany.mockResolvedValue(lecturas);
});

describe("/compatibility", () => {
  it("sends visitors without a session to login", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(CompatibilityPage()).rejects.toThrow("NEXT_REDIRECT /login?callbackUrl=/compatibility");
  });

  it("with a profile: one h1, the form as a sheet with an id on every field, what is compared and the archive", async () => {
    const { container } = render(await CompatibilityPage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "form.title" })).toBeInTheDocument();

    for (const input of container.querySelectorAll("form input")) {
      expect(input.id).not.toBe("");
      expect(container.querySelector(`label[for="${input.id}"]`)).toBeInTheDocument();
    }

    const como = screen.getByRole("complementary", { name: "how.title" });
    expect(within(como).getAllByRole("listitem")).toHaveLength(5);

    const archivo = screen.getByRole("region", { name: "previous.title" });
    const enlaces = within(archivo).getAllByRole("link");
    expect(enlaces.map((a) => a.getAttribute("href"))).toEqual(["/compatibility/c2", "/compatibility/c1"]);
    expect(within(archivo).getAllByRole("meter")).toHaveLength(1);
    expect(within(archivo).getByText("previous.count")).toBeInTheDocument();
  });

  it("without a profile: asks for it first, with the way to the profile and no form", async () => {
    db.userProfile.findUnique.mockResolvedValue(null);
    db.compatibilityReading.findMany.mockResolvedValue([]);
    const { container } = render(await CompatibilityPage());
    expect(container.querySelector('[data-estado="sin-perfil"]')).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "profileRequired.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "profileRequired.cta" })).toHaveAttribute("href", "/profile/setup");
    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "previous.title" })).not.toBeInTheDocument();
  });
});
