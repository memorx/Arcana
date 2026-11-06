/**
 * Modales de logro, desafío, nivel y carta dorada (L5) sobre tinta: cada uno con su `h2` que nombra el diálogo,
 * créditos en mono, botón que cierra, nada de la paleta vieja ni de imageUrl, y la carta dorada como la única con
 * brasa rosa. Las props son las que les pasa reading/new/[spreadTypeId]/page.tsx.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { AchievementUnlockedModal } from "@/components/achievements/AchievementUnlockedModal";
import { ChallengeCompletedModal } from "@/components/challenges/ChallengeCompletedModal";
import { LevelUpModal } from "@/components/levels/LevelUpModal";
import { GoldenCardModal } from "@/components/golden";
import { GOLDEN_CARD_CREDITS_REWARD } from "@/lib/golden-cards";

let mockLocale: "es" | "en" = "es";
const mockMensajes: Record<string, unknown> = {
  es: jest.requireActual("../../../messages/es.json"),
  en: jest.requireActual("../../../messages/en.json"),
};

jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => {
    const msg = `${ns}.${key}`
      .split(".")
      .reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), mockMensajes[mockLocale]);
    if (typeof msg !== "string") throw new Error(`falta ${ns}.${key}`);
    return msg.replace(/\{(\w+)\}/g, (_, k: string) => String(values?.[k] ?? `{${k}}`));
  },
}));

const PALETA_VIEJA =
  /(slate|purple|violet|indigo|fuchsia|pink|amber|yellow|orange|red|rose|emerald|green|teal|blue|sky|cyan)-\d{2,3}|text-white|bg-gradient/;

/** El diálogo abierto está sobre tinta y su nombre accesible es el h2 visible. */
function dialogoNombradoPor(titulo: string) {
  const dialogo = screen.getByRole("dialog", { name: titulo });
  expect(dialogo).toHaveClass("suelo-tinta");
  const h2 = screen.getByRole("heading", { level: 2, name: titulo });
  expect(dialogo).toHaveAttribute("aria-labelledby", h2.id);
  expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  expect(document.body.innerHTML).not.toMatch(PALETA_VIEJA);
  return dialogo;
}

beforeEach(() => {
  mockLocale = "es";
});

describe("AchievementUnlockedModal", () => {
  const logros = [
    { id: "a1", key: "first_reading", name: "First Reading", nameEs: "Primera Lectura", description: "d", descriptionEs: "Completa tu primera lectura", icon: "🌟", category: "readings", creditReward: 1 },
    { id: "a2", key: "early_bird", name: "Early Bird", nameEs: "Madrugador", description: "d", descriptionEs: "Antes de las 7", icon: "🌅", category: "time", creditReward: 2 },
  ];

  it("h2, cada logro con su sello y el total de créditos; Continuar cierra", () => {
    const onClose = jest.fn();
    render(<AchievementUnlockedModal isOpen onClose={onClose} achievements={logros} />);
    dialogoNombradoPor("¡Logro Desbloqueado!");

    expect(screen.getByRole("heading", { level: 3, name: "Primera Lectura" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Madrugador" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-estado='logrado'][aria-hidden='true']")).toHaveLength(2);
    expect(screen.getByText("Has ganado 3 créditos")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    // La palabra a pincel es un sello decorativo: no es encabezado ni nombre del diálogo.
    expect(screen.getByText("Logro")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sin logros no pinta nada", () => {
    const { container } = render(<AchievementUnlockedModal isOpen onClose={jest.fn()} achievements={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ChallengeCompletedModal", () => {
  it("h2, chispas decorativas en dos tintas y créditos", () => {
    const onClose = jest.fn();
    render(
      <ChallengeCompletedModal
        isOpen
        onClose={onClose}
        challenges={[{ id: "c1", key: "weekly_explorer", name: "Weekly Explorer", nameEs: "Explorador Semanal", icon: "🔍", creditReward: 3 }]}
      />
    );
    dialogoNombradoPor("¡Desafío Completado!");

    const chispas = document.querySelector("[data-chispas]")!;
    expect(chispas).toHaveAttribute("aria-hidden", "true");
    expect(chispas.children).toHaveLength(10);
    expect(screen.getByRole("heading", { level: 3, name: "Explorador Semanal" })).toBeInTheDocument();
    expect(screen.getByText("Has ganado 3 créditos de desafíos")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("LevelUpModal", () => {
  it("h2, el sello con el número romano del nivel y la recompensa (conserva las props de la lectura)", () => {
    render(
      <LevelUpModal isOpen onClose={jest.fn()} newLevel={3} levelName="Adept" levelNameEs="Adepto" levelIcon="🔮" creditsAwarded={5} />
    );
    dialogoNombradoPor("¡Subiste de Nivel!");

    expect(screen.getByText("III")).toBeInTheDocument();
    expect(screen.getByText("¡Ahora eres Adepto!")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText("¡Sigue así! Tu viaje continúa.")).toBeInTheDocument();
    expect(screen.queryByText("🔮")).toBeNull();
  });

  it("nivel máximo sin recompensa: su mensaje y sin bloque de créditos", () => {
    mockLocale = "en";
    render(
      <LevelUpModal isOpen onClose={jest.fn()} newLevel={5} levelName="Oracle" levelNameEs="Oráculo" levelIcon="👁️" creditsAwarded={0} />
    );
    dialogoNombradoPor("Level Up!");
    expect(screen.getByText("V")).toBeInTheDocument();
    expect(screen.getByText("You are now Oracle!")).toBeInTheDocument();
    expect(screen.queryByText("Reward")).toBeNull();
    expect(screen.getByText("You've reached the pinnacle of mastery!")).toBeInTheDocument();
  });
});

describe("GoldenCardModal", () => {
  const estrella = { id: "g1", name: "The Star", nameEs: "La Estrella", imageUrl: "https://upload.wikimedia.org/x.jpg", arcana: "MAJOR", suit: null, isNew: true, creditsAwarded: 1 };

  it("una dorada: h2, la carta a color propia con la única brasa rosa, «Nueva» y créditos", () => {
    const onClose = jest.fn();
    render(<GoldenCardModal isOpen onClose={onClose} cards={[estrella]} />);
    const dialogo = dialogoNombradoPor("¡CARTA DORADA!");

    const img = screen.getByRole("img", { name: "La Estrella" });
    expect(img.getAttribute("src")).toMatch(/\/cartas\/rws-tarot-17-star-color\.webp$/);
    expect(dialogo.innerHTML).not.toMatch(/wikimedia/);
    expect(dialogo.querySelectorAll(".golden-card-glow")).toHaveLength(1);
    expect(dialogo.querySelectorAll(".golden-card-border")).toHaveLength(1);
    expect(img.closest(".golden-card-glow")).not.toBeNull();
    expect(screen.getByText("Nueva")).toBeInTheDocument();
    expect(screen.getByText(`+${GOLDEN_CARD_CREDITS_REWARD}`)).toBeInTheDocument();
    expect(screen.getByText("¡Agregada a tu colección dorada!")).toBeInTheDocument();

    // El botón ya no es texto oscuro sobre ámbar: es el primario de Dos tintas (rosa-luz con letra tinta).
    const continuar = screen.getByRole("button", { name: "Continuar" });
    expect(continuar.className).toMatch(/bg-rosa-luz/);
    expect(continuar.className).toMatch(/text-tinta/);
    fireEvent.click(continuar);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("varias doradas: título en plural y una brasa por carta", () => {
    render(
      <GoldenCardModal
        isOpen
        onClose={jest.fn()}
        cards={[
          estrella,
          { ...estrella, id: "g2", name: "Two of Cups", nameEs: "Dos de Copas", arcana: "MINOR", suit: "CUPS", isNew: false },
          { ...estrella, id: "g3", name: "The Lovers", nameEs: "Los Enamorados", isNew: false },
        ]}
      />
    );
    const dialogo = dialogoNombradoPor("¡3 CARTAS DORADAS!");
    expect(dialogo.querySelectorAll(".golden-card-glow")).toHaveLength(3);
    expect(screen.getByRole("img", { name: "Los Enamorados" }).getAttribute("src")).toMatch(/\/cartas\/rws-tarot-06-lovers-color\.webp$/);
    expect(screen.getByText(`+${3 * GOLDEN_CARD_CREDITS_REWARD}`)).toBeInTheDocument();
  });

  it("si la imagen falla, el marcador de carta", () => {
    render(<GoldenCardModal isOpen onClose={jest.fn()} cards={[estrella]} />);
    fireEvent.error(screen.getByRole("img", { name: "La Estrella" }));
    expect(screen.queryByRole("img", { name: "La Estrella" })).toBeNull();
    expect(screen.getAllByText("La Estrella").length).toBeGreaterThanOrEqual(2);
  });
});
