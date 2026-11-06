/**
 * CollectionWidget (dashboard): las miniaturas de «descubiertas recientemente» enlazan a /cards/[slug], que busca
 * por slug (con el id de la base salía un 404). getRecentlyDiscovered pide el slug junto a lo que ya leía.
 */
import { render, screen } from "@testing-library/react";

jest.mock("@/lib/prisma", () => ({
  prisma: { userCardCollection: { findMany: jest.fn() } },
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (ns: string) => (key: string) => `${ns}.${key}`),
  getLocale: jest.fn(async () => "es"),
}));

// The real getRecentlyDiscovered (over the mocked prisma), wrapped so the widget test can feed it cards.
jest.mock("@/lib/collection", () => {
  const real = jest.requireActual("@/lib/collection");
  return { ...real, getCollectionStats: jest.fn(), getRecentlyDiscovered: jest.fn(real.getRecentlyDiscovered) };
});

import { prisma } from "@/lib/prisma";
import { getCollectionStats, getRecentlyDiscovered } from "@/lib/collection";
import { CollectionWidget } from "@/components/dashboard/CollectionWidget";

const findMany = (prisma.userCardCollection as unknown as { findMany: jest.Mock }).findMany;

const carta = (id: string, slug: string | null, name: string, nameEs: string) => ({
  id,
  slug,
  name,
  nameEs,
  imageUrl: "https://upload.wikimedia.org/no-se-usa.jpg",
  arcana: "MAJOR",
  suit: null,
});

describe("getRecentlyDiscovered", () => {
  it("lee también el slug de cada carta (sólo un campo más en la misma consulta)", async () => {
    findMany.mockResolvedValue([{ card: carta("ckx1", "the-star", "The Star", "La Estrella") }]);
    const cartas = await getRecentlyDiscovered("user-1", 3);

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { discoveredAt: "desc" },
      take: 3,
      include: {
        card: {
          select: { id: true, slug: true, name: true, nameEs: true, imageUrl: true, arcana: true, suit: true },
        },
      },
    });
    expect(cartas[0].slug).toBe("the-star");
  });
});

describe("CollectionWidget", () => {
  it("cada miniatura enlaza a /cards/<slug>, no al id; sin slug, a /collection", async () => {
    (getCollectionStats as jest.Mock).mockResolvedValue({ discovered: 3, total: 78, percentage: 4 });
    (getRecentlyDiscovered as jest.Mock).mockResolvedValueOnce([
      carta("ckx1", "the-star", "The Star", "La Estrella"),
      carta("ckx2", "two-of-cups", "Two of Cups", "Dos de Copas"),
      carta("ckx3", null, "The Fool", "El Loco"),
    ]);
    render(await CollectionWidget({ userId: "user-1" }));

    expect(screen.getByRole("link", { name: "La Estrella" })).toHaveAttribute("href", "/cards/the-star");
    expect(screen.getByRole("link", { name: "Dos de Copas" })).toHaveAttribute("href", "/cards/two-of-cups");
    expect(screen.getByRole("link", { name: "El Loco" })).toHaveAttribute("href", "/collection");
    for (const enlace of screen.getAllByRole("link")) expect(enlace.getAttribute("href")).not.toMatch(/ckx/);
  });
});
