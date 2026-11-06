import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async () => (key: string) => key),
  getLocale: jest.fn(async () => "es"),
}));
jest.mock("@/lib/xp", () => ({ getUserLevelProgress: jest.fn() }));

import { LevelWidget, LEVEL_PROGRESS_HREF } from "@/components/dashboard/LevelWidget";
import { getUserLevelProgress } from "@/lib/xp";

const mockProgress = getUserLevelProgress as jest.Mock;

const ADEPTO = {
  level: 3,
  levelName: "Adept",
  levelNameEs: "Adepto",
  levelIcon: "🔮",
  xp: 420,
  xpForCurrentLevel: 300,
  xpForNextLevel: 700,
  progress: 30,
  isMaxLevel: false,
};

/** Every route of the app, from the page.tsx files (route groups like "(main)" don't count). */
function rutasDeLaApp(): Set<string> {
  const raiz = path.join(process.cwd(), "src", "app");
  const rutas = new Set<string>();
  const recorrer = (dir: string, segmentos: string[]) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entrada.isDirectory()) {
        const siguiente = /^\(.*\)$/.test(entrada.name) ? segmentos : [...segmentos, entrada.name];
        recorrer(path.join(dir, entrada.name), siguiente);
      } else if (entrada.name === "page.tsx") {
        rutas.add(`/${segmentos.join("/")}`);
      }
    }
  };
  recorrer(raiz, []);
  return rutas;
}

describe("LevelWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  it("links its progress to a page that exists (there is no /progress: it was a 404 on the dashboard)", async () => {
    mockProgress.mockResolvedValue(ADEPTO);

    render(await LevelWidget({ userId: "user-1" }));

    const enlace = screen.getByRole("link", { name: "viewAchievements" });
    expect(enlace).toHaveAttribute("href", LEVEL_PROGRESS_HREF);
    expect(LEVEL_PROGRESS_HREF).toBe("/achievements");
    expect(rutasDeLaApp()).toContain(LEVEL_PROGRESS_HREF);
    expect(rutasDeLaApp()).not.toContain("/progress");
    expect(document.querySelector('a[href="/progress"]')).toBeNull();
  });

  it("shows the level, its name, the XP and the bar to the next level", async () => {
    mockProgress.mockResolvedValue(ADEPTO);

    render(await LevelWidget({ userId: "user-1" }));

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("level 3");
    expect(screen.getByText("Adepto")).toBeInTheDocument();
    expect(screen.getByText(/420 XP/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText(/120 \/ 400 XP/)).toBeInTheDocument();
    // No level emoji: the level number is the seal
    expect(screen.queryByText("🔮")).not.toBeInTheDocument();
  });

  it("at the top level there is no bar, only the message", async () => {
    mockProgress.mockResolvedValue({ ...ADEPTO, level: 5, isMaxLevel: true, xpForNextLevel: null, progress: 100 });

    render(await LevelWidget({ userId: "user-1" }));

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("maxLevel")).toBeInTheDocument();
  });
});
