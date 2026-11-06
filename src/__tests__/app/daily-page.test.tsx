import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/components/energies/TodayEnergies", () => ({
  TodayEnergies: jest.fn(() => null),
}));

import DailyPage from "@/app/(main)/daily/page";
import { TodayEnergies } from "@/components/energies/TodayEnergies";
import { todayUtc } from "@/lib/systems";

// next-intl is mocked in jest.setup.ts: t(key) returns the key.

const mockTodayEnergies = TodayEnergies as unknown as jest.Mock;

function mockApis(profile: Record<string, unknown> | null) {
  const bodies: Record<string, unknown> = {
    "/api/subscription": {
      subscription: { status: "active", freeReadingsUsed: 0, freeReadingsPerMonth: 1 },
    },
    "/api/daily-reading": { today: null, recent: [] },
    "/api/profile": { profile },
  };
  global.fetch = jest.fn(async (url: string) => ({ ok: true, json: async () => bodies[url] })) as jest.Mock;
}

describe("/daily: today's energies", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockTodayEnergies.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("mounts TodayEnergies with today and the profile's birth date", async () => {
    mockApis({ emailTime: "09:00", birthDate: "1990-07-15T00:00:00.000Z" });

    render(<DailyPage />);

    await waitFor(() => expect(mockTodayEnergies).toHaveBeenCalled());
    const props = mockTodayEnergies.mock.calls.at(-1)![0];
    expect(props.birthDate).toBeInstanceOf(Date);
    expect(props.birthDate.toISOString()).toBe("1990-07-15T00:00:00.000Z");
    expect(props.date.toISOString()).toBe(todayUtc().toISOString());
    // Above today's card
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("noCardYet")).toBeInTheDocument();
  });

  it("passes no birth date when the profile has none", async () => {
    mockApis(null);

    render(<DailyPage />);

    await waitFor(() => expect(mockTodayEnergies).toHaveBeenCalled());
    expect(mockTodayEnergies.mock.calls.at(-1)![0].birthDate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The daily card on ink (rediseño «Dos tintas», L3)
// ---------------------------------------------------------------------------

const ESTRELLA = {
  id: "daily-1",
  date: "2026-11-05T00:00:00.000Z",
  cardId: "card-star",
  isReversed: false,
  interpretation: "Primer párrafo del día.\nSegundo párrafo del día.",
  sentAt: null,
  card: { id: "card-star", name: "The Star", nameEs: "La Estrella", arcana: "MAJOR", suit: null },
};

function mockDaily({
  status = "active",
  today = null as typeof ESTRELLA | null,
  recent = [] as (typeof ESTRELLA)[],
} = {}) {
  const bodies: Record<string, unknown> = {
    "/api/subscription": { subscription: status ? { status, freeReadingsUsed: 0, freeReadingsPerMonth: 1 } : null },
    "/api/daily-reading": { today, recent },
    "/api/profile": { profile: { emailTime: "07:30" } },
  };
  global.fetch = jest.fn(async (url: string) => ({ ok: true, json: async () => bodies[url] })) as jest.Mock;
}

describe("/daily: today's card on ink", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows today's card face down on an ink scene, with the message hidden until it is turned", async () => {
    mockDaily({ today: ESTRELLA });

    const { container } = render(<DailyPage />);

    const carta = await screen.findByRole("button", { name: "voltearPosicion" });
    const escena = screen.getByRole("heading", { level: 1 }).closest("[data-suelo]");
    expect(escena).toHaveAttribute("data-suelo", "tinta");
    expect(escena).toContainElement(carta);
    expect(container.querySelector(".cq")).toHaveAttribute("data-estado", "boca-abajo");
    expect(container.querySelector(".cq--grande")).not.toBeNull();
    expect(container.querySelector(".cq-cara")).toHaveAttribute("src", "/cartas/rws-tarot-17-star-color.webp");
    expect(screen.getByText("boca")).toBeInTheDocument();
    expect(screen.queryByText("Primer párrafo del día.")).not.toBeInTheDocument();
    // The brush sweep plays once when arriving
    expect(screen.getAllByTestId("transicion-pincel")).toHaveLength(1);
  });

  it("turning the card shows its name and the message, and remembers it for the day", async () => {
    mockDaily({ today: ESTRELLA });

    const { unmount } = render(<DailyPage />);
    fireEvent.click(await screen.findByRole("button", { name: "voltearPosicion" }));

    expect(await screen.findByRole("heading", { level: 2, name: "La Estrella" })).toBeInTheDocument();
    expect(screen.getByText("Primer párrafo del día.")).toBeInTheDocument();
    expect(screen.getByText("Segundo párrafo del día.")).toBeInTheDocument();
    expect(screen.queryByText("boca")).not.toBeInTheDocument();
    // UTC day, not the day before in Mexico
    expect(screen.getByText(/5 de noviembre de 2026/)).toBeInTheDocument();
    unmount();

    // Coming back the same day: already turned, no burning again
    render(<DailyPage />);
    expect(await screen.findByRole("heading", { level: 2, name: "La Estrella" })).toBeInTheDocument();
    expect(document.querySelector(".cq")).toHaveAttribute("data-estado", "revelada");
  });

  it("waiting for the first card: a card back that is not a button and the time it arrives", async () => {
    mockDaily({ today: null });

    render(<DailyPage />);

    expect(await screen.findByText("noCardYet")).toBeInTheDocument();
    expect(screen.getByText("cardWillArrive")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "voltearPosicion" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("title");
  });

  it("without a subscription: the preview and the link to subscribe, no energies", async () => {
    mockDaily({ status: "", today: null });

    render(<DailyPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "noSubscription" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "subscribeNow" })).toHaveAttribute("href", "/subscribe");
    expect(screen.getByText("preview")).toBeInTheDocument();
    expect(mockTodayEnergies).not.toHaveBeenCalled();
  });

  it("credits exhausted: buy credits or subscribe again", async () => {
    mockDaily({ status: "credits_exhausted" });

    render(<DailyPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "creditsExhausted" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "buyCredits" })).toHaveAttribute("href", "/credits");
    expect(screen.getByRole("link", { name: "resubscribe" })).toHaveAttribute("href", "/subscribe");
  });

  it("lists the previous days as engravings in ink, with their UTC date", async () => {
    mockDaily({
      today: ESTRELLA,
      recent: [{ ...ESTRELLA, id: "d0", date: "2026-11-04T00:00:00.000Z", isReversed: true, card: { ...ESTRELLA.card, id: "c-death", name: "Death", nameEs: "La Muerte" } }],
    });

    render(<DailyPage />);

    const anteriores = await screen.findByRole("heading", { level: 2, name: "history" });
    const seccion = anteriores.closest("section")!;
    const img = seccion.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/cartas/rws-tarot-13-death-tinta.webp");
    expect(img).toHaveAttribute("alt", "La Muerte");
    expect(seccion).toHaveTextContent(/mié/i);
    expect(seccion).toHaveTextContent("4");
    expect(seccion).toHaveTextContent("reversed");
  });
});
