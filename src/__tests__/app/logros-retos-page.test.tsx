/**
 * /achievements y /challenges en «Dos tintas» (L5): archivo de sellos con su estado (logrado / en curso /
 * bloqueado) y barras de progreso accesibles (`role="progressbar"` con valores). Textos reales de messages/.
 */
import { render, screen, within, fireEvent } from "@testing-library/react";
import AchievementsPage from "@/app/(main)/achievements/page";
import ChallengesPage from "@/app/(main)/challenges/page";

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

function responder(datos: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(datos) }) as unknown as typeof fetch;
}

const logro = (o: Partial<Record<string, unknown>>) => ({
  id: "x",
  key: "x",
  name: "X",
  nameEs: "X",
  description: "d",
  descriptionEs: "d",
  icon: "🌟",
  category: "readings",
  requirement: 1,
  creditReward: 1,
  isUnlocked: false,
  unlockedAt: null,
  progress: 0,
  ...o,
});

const LOGROS = {
  achievements: [
    logro({ id: "a1", nameEs: "Primera Lectura", requirement: 1, isUnlocked: true, unlockedAt: "2026-11-02T12:00:00Z", progress: 1 }),
    logro({ id: "a2", nameEs: "Buscador de Respuestas", requirement: 10, progress: 3, creditReward: 2 }),
    logro({ id: "a3", nameEs: "Constante", category: "streak", requirement: 7, progress: 0 }),
    logro({ id: "a4", nameEs: "Primer Oro", category: "golden", requirement: 1, isUnlocked: true, unlockedAt: "2026-11-03T12:00:00Z", progress: 1 }),
  ],
  stats: { unlocked: 2, total: 4, percentage: 50 },
};

describe("/achievements", () => {
  beforeEach(() => {
    mockLocale = "es";
  });

  it("contador y barra general con sus valores", async () => {
    responder(LOGROS);
    const { container } = render(<AchievementsPage />);
    await screen.findByRole("heading", { level: 2, name: "Lecturas" });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector("[data-contador]")?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "2 de 4 desbloqueados"
    );
    const general = screen.getByRole("progressbar", { name: "Logros" });
    expect(general).toHaveAttribute("aria-valuenow", "2");
    expect(general).toHaveAttribute("aria-valuemax", "4");
    expect(general).toHaveAttribute("aria-valuetext", "2 de 4 desbloqueados");
  });

  it("cada sello con su estado: logrado, en curso y bloqueado", async () => {
    responder(LOGROS);
    const { container } = render(<AchievementsPage />);
    await screen.findByRole("heading", { level: 2, name: "Lecturas" });

    const fila = (nombre: string) => screen.getByRole("heading", { level: 3, name: nombre }).closest("li")!;

    const logrado = fila("Primera Lectura");
    expect(logrado).toHaveAttribute("data-estado", "logrado");
    expect(within(logrado).getByText("Desbloqueado")).toBeInTheDocument();
    expect(within(logrado).queryByRole("progressbar")).toBeNull();
    expect(logrado.querySelector("[data-estado='logrado'][aria-hidden='true']")).not.toBeNull();

    const enCurso = fila("Buscador de Respuestas");
    expect(enCurso).toHaveAttribute("data-estado", "en-curso");
    expect(within(enCurso).getByText("En curso")).toBeInTheDocument();
    const barra = within(enCurso).getByRole("progressbar", { name: "Buscador de Respuestas" });
    expect(barra).toHaveAttribute("aria-valuenow", "3");
    expect(barra).toHaveAttribute("aria-valuemax", "10");
    expect(barra).toHaveAttribute("aria-valuetext", "3 de 10");
    expect(within(enCurso).getByText("+2 creditos")).toBeInTheDocument();

    const bloqueado = fila("Constante");
    expect(bloqueado).toHaveAttribute("data-estado", "bloqueado");
    expect(within(bloqueado).getByText("Bloqueado")).toBeInTheDocument();
    expect(within(bloqueado).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    expect(container.innerHTML).not.toMatch(/(slate|purple|amber|yellow|emerald)-\d{2,3}|text-white/);
  });

  it("las cartas doradas también tienen su archivo (las cuenta el total)", async () => {
    responder(LOGROS);
    render(<AchievementsPage />);
    expect(await screen.findByRole("heading", { level: 2, name: "Cartas Doradas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Primer Oro" })).toBeInTheDocument();
  });
});

const reto = (o: Partial<Record<string, unknown>>) => ({
  id: "r",
  key: "r",
  name: "R",
  nameEs: "R",
  description: "d",
  descriptionEs: "d",
  icon: "🔍",
  type: "weekly",
  target: 5,
  creditReward: 3,
  progress: 0,
  completed: false,
  completedAt: null,
  ...o,
});

const RETOS = {
  weekly: [
    reto({ id: "r1", nameEs: "Explorador Semanal", target: 5, progress: 5, completed: true }),
    reto({ id: "r2", nameEs: "Variedad", target: 3, progress: 2 }),
  ],
  monthly: [reto({ id: "r3", nameEs: "Dedicado", type: "monthly", target: 20, progress: 0 })],
  stats: { weekly: { completed: 1, total: 2 }, monthly: { completed: 0, total: 1 } },
  resets: { weekly: { days: 2, hours: 4, minutes: 0 }, monthly: { days: 20, hours: 1, minutes: 0 } },
};

describe("/challenges", () => {
  beforeEach(() => {
    mockLocale = "es";
  });

  it("pestañas accesibles: aria-selected, flechas, Inicio y Fin", async () => {
    responder(RETOS);
    render(<ChallengesPage />);
    await screen.findByRole("heading", { level: 2, name: "Explorador Semanal" });

    const lista = screen.getByRole("tablist", { name: "Periodo de los desafíos" });
    const semanales = within(lista).getByRole("tab", { name: "Semanales" });
    const mensuales = within(lista).getByRole("tab", { name: "Mensuales" });
    expect(semanales).toHaveAttribute("aria-selected", "true");
    expect(semanales).toHaveAttribute("tabindex", "0");
    expect(mensuales).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", semanales.id);

    fireEvent.keyDown(semanales, { key: "ArrowRight" });
    expect(mensuales).toHaveAttribute("aria-selected", "true");
    expect(mensuales).toHaveFocus();
    expect(screen.getByRole("heading", { level: 2, name: "Dedicado" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Explorador Semanal" })).toBeNull();

    fireEvent.keyDown(mensuales, { key: "Home" });
    expect(semanales).toHaveAttribute("aria-selected", "true");
    expect(semanales).toHaveFocus();
  });

  it("cada desafío con su barra y su estado; el contador del periodo", async () => {
    responder(RETOS);
    const { container } = render(<ChallengesPage />);
    await screen.findByRole("heading", { level: 2, name: "Explorador Semanal" });

    expect(container.querySelector("[data-contador]")?.textContent?.replace(/\s+/g, " ").trim()).toBe("1/2 completado");
    expect(screen.getByText("Reinicia en 2d 4h")).toBeInTheDocument();

    const cumplido = screen.getByRole("heading", { level: 2, name: "Explorador Semanal" }).closest("li")!;
    expect(cumplido).toHaveAttribute("data-estado", "logrado");
    expect(within(cumplido).getByText("Completado")).toBeInTheDocument();
    const lleno = within(cumplido).getByRole("progressbar", { name: "Explorador Semanal" });
    expect(lleno).toHaveAttribute("aria-valuenow", "5");
    expect(lleno).toHaveAttribute("aria-valuemax", "5");
    expect(lleno).toHaveAttribute("data-logrado", "true");

    const enCurso = screen.getByRole("heading", { level: 2, name: "Variedad" }).closest("li")!;
    expect(within(enCurso).getByText("En Progreso")).toBeInTheDocument();
    const barra = within(enCurso).getByRole("progressbar", { name: "Variedad" });
    expect(barra).toHaveAttribute("aria-valuenow", "2");
    expect(barra).toHaveAttribute("aria-valuetext", "2 de 3");
    expect(barra).not.toHaveAttribute("data-logrado");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/(slate|purple|pink|emerald|teal)-\d{2,3}|text-white/);
  });

  it("sin desafíos: el aviso en lugar de la lista", async () => {
    responder({ weekly: [], monthly: [], stats: null, resets: null });
    render(<ChallengesPage />);
    expect(await screen.findByText("No hay desafios disponibles")).toBeInTheDocument();
  });
});
