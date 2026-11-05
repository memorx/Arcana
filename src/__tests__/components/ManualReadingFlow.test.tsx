import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { CardPicker } from "@/components/manual/CardPicker";
import { ManualReadingFlow, type ManualSpread } from "@/components/manual/ManualReadingFlow";
import type { DeckCard } from "@/components/manual/manual-cards";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  usePathname: () => "/reading/manual",
  useSearchParams: () => new URLSearchParams(),
}));

// The global next-intl mock returns the key; here we also append the values so labels are distinguishable.
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${Object.values(values).join(" ")}` : key,
  useLocale: () => "es",
}));

const deck: DeckCard[] = [
  { id: "major_0", name: "The Fool", nameEs: "El Loco", arcana: "MAJOR", suit: null, number: 0, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg" },
  { id: "major_16", name: "The Tower", nameEs: "La Torre", arcana: "MAJOR", suit: null, number: 16, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg" },
  { id: "cups_3", name: "Three of Cups", nameEs: "Tres de Copas", arcana: "MINOR", suit: "CUPS", number: 3, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Cups03.jpg" },
  { id: "swords_1", name: "Ace of Swords", nameEs: "As de Espadas", arcana: "MINOR", suit: "SWORDS", number: 1, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Swords01.jpg" },
];

const twoCardSpread: ManualSpread = {
  id: "spread-2",
  name: "Two Paths",
  nameEs: "Dos Caminos",
  description: "",
  descriptionEs: "",
  cardCount: 2,
  creditCost: 1,
  category: "classic",
  positions: [
    { position: 1, name: "Now", nameEs: "Ahora", description: "" },
    { position: 2, name: "Next", nameEs: "Después", description: "" },
  ],
};

const expensiveSpread: ManualSpread = {
  ...twoCardSpread,
  id: "spread-big",
  name: "Big One",
  nameEs: "La Grande",
  creditCost: 5,
};

describe("CardPicker (F-61)", () => {
  const renderPicker = (props: Partial<Parameters<typeof CardPicker>[0]> = {}) => {
    const onPick = jest.fn();
    render(
      <CardPicker cards={deck} takenAt={{}} activeCardId={null} onPick={onPick} locale="es" {...props} />
    );
    return onPick;
  };

  it("shows the 78-card grid as buttons and picks a card on click", () => {
    const onPick = renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "pickCard La Torre" }));

    expect(onPick).toHaveBeenCalledWith("major_16");
  });

  it("marks a card already placed elsewhere and doesn't let it be picked again", () => {
    const onPick = renderPicker({ takenAt: { major_16: 2 } });

    const taken = screen.getByRole("button", { name: "alreadyChosen La Torre 2" });
    expect(taken).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(taken);

    expect(onPick).not.toHaveBeenCalled();
  });

  it("shows the card of the active position as pressed", () => {
    renderPicker({ takenAt: { cups_3: 1 }, activeCardId: "cups_3" });

    expect(screen.getByRole("button", { name: "pickCard Tres de Copas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("searches by Spanish or English name without accents", () => {
    renderPicker();

    fireEvent.change(screen.getByLabelText("searchLabel"), { target: { value: "tower" } });

    expect(screen.getByRole("button", { name: "pickCard La Torre" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "pickCard El Loco" })).not.toBeInTheDocument();
  });

  it("filters by suit and shows an empty state when nothing matches", () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "filters.cups" }));
    expect(screen.getByRole("button", { name: "filters.cups" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "pickCard Tres de Copas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "pickCard La Torre" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("searchLabel"), { target: { value: "torre" } });
    expect(screen.getByText("noResults torre")).toBeInTheDocument();
  });

  it("moves focus between cards with the arrow keys", () => {
    renderPicker();
    const first = screen.getByRole("button", { name: "pickCard El Loco" });
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "pickCard La Torre" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("button", { name: "pickCard As de Espadas" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(first).toHaveFocus();
  });
});

describe("ManualReadingFlow (F-61)", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/cards") return { ok: true, json: async () => deck };
      return {
        ok: true,
        status: 200,
        json: async () => ({ reading: { id: "reading-xyz" } }),
      };
    });
  });

  const renderFlow = (overrides: Partial<Parameters<typeof ManualReadingFlow>[0]> = {}) =>
    render(
      <ManualReadingFlow
        spreadTypes={[twoCardSpread, expensiveSpread]}
        freeReadingsLeft={0}
        credits={2}
        locale="es"
        {...overrides}
      />
    );

  const pickBothCards = async () => {
    fireEvent.click(screen.getByRole("button", { name: /Dos Caminos/ }));
    await screen.findByRole("button", { name: "pickCard La Torre" });

    fireEvent.click(screen.getByRole("button", { name: "pickCard La Torre" }));
    // Position 2 is now active; position 1 can be marked reversed
    fireEvent.click(screen.getByRole("button", { name: "reversedToggle Ahora" }));
    fireEvent.click(screen.getByRole("button", { name: "pickCard Tres de Copas" }));
  };

  /** Lets the deck request started on mount settle inside act(). */
  const flushDeck = () => act(async () => {});

  it("loads the deck from GET /api/cards", async () => {
    renderFlow();
    await flushDeck();

    expect(mockFetch).toHaveBeenCalledWith("/api/cards");
  });

  it("doesn't let you start a spread you can't afford", async () => {
    renderFlow();
    await flushDeck();

    const big = screen.getByRole("button", { name: /La Grande/ });
    expect(big).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(big);

    expect(screen.queryByText("pickCardsTitle")).not.toBeInTheDocument();
  });

  it("continues only when every position has a card, without repeating cards", async () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: /Dos Caminos/ }));
    await screen.findByRole("button", { name: "pickCard La Torre" });

    const continueButton = screen.getByRole("button", { name: "next" });
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "pickCard La Torre" }));
    // La Torre is now in position 1, so it can't be chosen for position 2
    expect(screen.getByRole("button", { name: "alreadyChosen La Torre 1" })).toHaveAttribute("aria-disabled", "true");
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "pickCard Tres de Copas" }));
    expect(continueButton).toBeEnabled();
  });

  it("sends the chosen cards with their orientation and opens the saved reading", async () => {
    renderFlow();
    await pickBothCards();

    fireEvent.click(screen.getByRole("button", { name: "next" }));
    const textarea = screen.getByLabelText("intentionHint");
    const submit = screen.getByRole("button", { name: "submit" });
    expect(submit).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "¿Qué necesito ver de este cambio?" } });
    fireEvent.click(submit);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/reading/reading-xyz"));
    const [url, init] = mockFetch.mock.calls.find(([u]) => u === "/api/reading/manual")!;
    expect(url).toBe("/api/reading/manual");
    expect(JSON.parse(init.body)).toEqual({
      spreadTypeId: "spread-2",
      intention: "¿Qué necesito ver de este cambio?",
      locale: "es",
      cards: [
        { position: 1, cardId: "major_16", isReversed: true },
        { position: 2, cardId: "cups_3", isReversed: false },
      ],
    });
  });

  it("keeps the intention and offers a retry when the AI is unavailable (503)", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/cards") return { ok: true, json: async () => deck };
      return { ok: false, status: 503, json: async () => ({ error: "interpretation_unavailable", retry: true }) };
    });
    renderFlow();
    await pickBothCards();
    fireEvent.click(screen.getByRole("button", { name: "next" }));
    fireEvent.change(screen.getByLabelText("intentionHint"), { target: { value: "Una intención larga" } });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("interpretationUnavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "retry" })).toBeEnabled();
    expect(screen.getByLabelText("intentionHint")).toHaveValue("Una intención larga");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("links to credits when the charge is rejected (403)", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/cards") return { ok: true, json: async () => deck };
      return { ok: false, status: 403, json: async () => ({ error: "Not enough credits for this reading" }) };
    });
    renderFlow();
    await pickBothCards();
    fireEvent.click(screen.getByRole("button", { name: "next" }));
    fireEvent.change(screen.getByLabelText("intentionHint"), { target: { value: "Una intención larga" } });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("needCredits")).toBeInTheDocument();
    expect(within(alert).getByRole("link")).toHaveAttribute("href", "/credits");
  });

  it("shows a retry when the deck can't be loaded", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => [] });
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: /Dos Caminos/ }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("cardsLoadError")).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole("button", { name: "retryLoad" }));
    expect(await screen.findByRole("button", { name: "pickCard La Torre" })).toBeInTheDocument();
  });
});
