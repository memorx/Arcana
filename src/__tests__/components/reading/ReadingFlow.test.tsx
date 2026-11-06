import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadingFlowPage from "@/app/(main)/reading/new/[spreadTypeId]/page";
import { Tirada } from "@/components/reading/Tirada";
import { NewCardDiscoveredModal } from "@/components/reading/NewCardDiscoveredModal";

// Keys with their namespace and values, so labels are distinguishable ("carta.voltearPosicion(Pasado)").
jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${ns}.${key}(${Object.values(values).join("|")})` : `${ns}.${key}`,
  useLocale: () => "es",
}));

// jsdom has no 2D canvas: CartaQuemable reveals with its short fade (the reduced-motion path).
jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => null) as never);

const SPREAD = {
  id: "s3",
  name: "Three Card Spread",
  nameEs: "Tirada de Tres Cartas",
  description: "Past, present, future",
  descriptionEs: "Pasado, presente y futuro",
  cardCount: 3,
  creditCost: 1,
  positions: [
    { position: 1, name: "Past", nameEs: "Pasado", description: "" },
    { position: 2, name: "Present", nameEs: "Presente", description: "" },
    { position: 3, name: "Future", nameEs: "Futuro", description: "" },
  ],
};

const card = (id: string, name: string, nameEs: string) => ({
  id,
  name,
  nameEs,
  arcana: "MAJOR",
  suit: null,
  keywords: [],
  meaningUpright: "",
  meaningReversed: "",
  meaningUprightEn: null,
  meaningReversedEn: null,
});

const RESULT = {
  reading: {
    id: "r1",
    intention: "¿Qué necesito ver de esta semana?",
    interpretation: "Primer párrafo.\n\nSegundo párrafo. ¿Qué te llevas?",
    createdAt: "2026-11-06T12:00:00Z",
    spreadType: SPREAD,
  },
  cards: [
    { position: 1, cardId: "major_9", isReversed: false, isGolden: false, card: card("major_9", "The Hermit", "El Ermitaño"), positionInfo: SPREAD.positions[0] },
    { position: 2, cardId: "cups_2", isReversed: true, isGolden: false, card: card("cups_2", "Two of Cups", "Dos de Copas"), positionInfo: SPREAD.positions[1] },
    { position: 3, cardId: "major_10", isReversed: false, isGolden: false, card: card("major_10", "Wheel of Fortune", "La Rueda de la Fortuna"), positionInfo: SPREAD.positions[2] },
  ],
  usedFreeReading: false,
};

const mockFetch = jest.fn();

function answerReadingWith(status: number, body: unknown) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/spread-types/")) return { ok: true, status: 200, json: async () => SPREAD };
    if (url === "/api/user/credits") return { ok: true, status: 200, json: async () => ({ credits: 10, freeReadingsLeft: 0 }) };
    if (url === "/api/reading") return { ok: status < 400, status, json: async () => body };
    throw new Error(`unexpected fetch ${url}`);
  });
}

async function startReading() {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  // An already settled promise: React's use() reads it without suspending (no Suspense boundary here).
  const params = Object.assign(Promise.resolve({ spreadTypeId: "s3" }), {
    status: "fulfilled",
    value: { spreadTypeId: "s3" },
  });
  render(<ReadingFlowPage params={params} />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });
  expect(await screen.findByRole("heading", { level: 1, name: "Tirada de Tres Cartas" })).toBeInTheDocument();

  await user.type(screen.getByRole("textbox", { name: "reading.intentionTitle" }), "¿Qué necesito ver de esta semana?");
  await user.click(screen.getByRole("button", { name: "reading.startReading" }));
  // Shuffling (2.5 s), then the API
  expect(screen.getByRole("heading", { level: 1, name: "reading.shuffling" })).toBeInTheDocument();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2600);
  });
  return user;
}

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = mockFetch as unknown as typeof fetch;
  window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  jest.useRealTimers();
  mockFetch.mockReset();
});

describe("revelar la tirada sobre papel (L2)", () => {
  it("revela con el teclado una carta a la vez y cuenta las reveladas", async () => {
    answerReadingWith(200, RESULT);
    const user = await startReading();

    expect(screen.getByRole("heading", { level: 1, name: "reading.revealing" })).toBeInTheDocument();
    expect(screen.getByText("reading.cardsRevealedCount(0|3)")).toBeInTheDocument();

    // Each face-down card is a button named after its position, in position order
    const cards = screen.getAllByRole("button", { name: /^carta\.voltearPosicion/ });
    expect(cards.map((b) => b.getAttribute("aria-label"))).toEqual([
      "carta.voltearPosicion(Pasado)",
      "carta.voltearPosicion(Presente)",
      "carta.voltearPosicion(Futuro)",
    ]);

    cards[1].focus();
    await user.keyboard("{Enter}");
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByText("reading.cardsRevealedCount(1|3)")).toBeInTheDocument();
    // The revealed card is announced by its name (and that it's reversed) and its name appears under it
    expect(screen.getByRole("button", { name: "Dos de Copas · carta.invertida" })).toBeInTheDocument();
    const [pasado, presente] = screen.getAllByRole("listitem");
    expect(presente.querySelector(".tirada-pie")).toHaveTextContent("Dos de Copasreading.reversed");
    expect(pasado.querySelector(".tirada-pie")).toHaveTextContent("");
    expect(screen.queryByRole("button", { name: "reading.viewInterpretation" })).not.toBeInTheDocument();
  });

  it("«voltear todas» revela el resto, completa el progreso y ofrece la interpretación", async () => {
    answerReadingWith(200, RESULT);
    const user = await startReading();

    await user.click(screen.getAllByRole("button", { name: /^carta\.voltearPosicion/ })[0]);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await user.click(screen.getByRole("button", { name: "carta.voltearTodas" }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText("reading.cardsRevealedCount(3|3)")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^carta\.voltearPosicion/ })).toHaveLength(0);
    expect(screen.getByText("reading.allCardsRevealed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "reading.viewInterpretation" }));
    expect(screen.getByRole("heading", { level: 1, name: "reading.yourReading" })).toBeInTheDocument();
    // The interpretation as a sheet: body paragraphs and the closing question apart
    const article = screen.getByRole("article", { name: "reading.interpretation" });
    expect(within(article).getByText("Primer párrafo.")).toBeInTheDocument();
    expect(within(article).getByText("¿Qué te llevas?").parentElement).toHaveClass("italic");
    expect(screen.getByRole("link", { name: "reading.viewSaved" })).toHaveAttribute("href", "/reading/r1");
  });

  it.each([
    [503, "reading.interpretationUnavailable"],
    [422, "reading.interpretationRefused"],
  ])("con %i vuelve a la intención con su aviso y sin perder lo escrito", async (status, aviso) => {
    answerReadingWith(status, { error: "x" });
    await startReading();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(aviso)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "reading.intentionTitle" })).toHaveValue("¿Qué necesito ver de esta semana?");
    expect(screen.getByRole("button", { name: "reading.retry" })).toBeEnabled();
    expect(screen.getByRole("heading", { level: 1, name: "Tirada de Tres Cartas" })).toBeInTheDocument();
  });

  it("con 403 ofrece comprar créditos en el modal", async () => {
    answerReadingWith(403, { error: "Not enough credits" });
    await startReading();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "reading.needCredits" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "reading.buyCredits" })).toHaveAttribute("href", "/credits");
  });
});

describe("<Tirada>: disposición por número de cartas (L2)", () => {
  const posiciones = (n: number) => Array.from({ length: n }, (_, i) => ({ numero: i + 1, nombre: `Pos ${i + 1}` }));

  it.each([
    [1, "", "tirada--una"],
    [3, "Three Card Spread", "tirada--fila"],
    [5, "Simple Cross", "tirada--cruz"],
    [5, "Love Reading", "tirada--fila"],
    [7, "Horseshoe Spread", "tirada--herradura"],
    [10, "Celtic Cross", "tirada--celta"],
    [12, "Year Ahead", "tirada--anio"],
  ])("%i cartas (%s) → %s, con el nombre de la posición encima de cada carta", (n, nombre, clase) => {
    render(
      <Tirada
        posiciones={posiciones(n)}
        nombreTirada={nombre}
        etiqueta="La tirada"
        carta={(p) => <span data-testid="carta">{p.numero}</span>}
      />
    );
    const lista = screen.getByRole("list", { name: "La tirada" });
    expect(lista).toHaveClass("tirada", clase);
    expect(lista).toHaveAttribute("data-total", String(n));
    const items = within(lista).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-pos"))).toEqual(Array.from({ length: n }, (_, i) => String(i + 1)));
    for (const [i, li] of items.entries()) {
      const etiqueta = within(li).getByText(`Pos ${i + 1}`);
      const carta = within(li).getByTestId("carta");
      expect(etiqueta.compareDocumentPosition(carta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("la herradura sube hacia el centro", () => {
    render(<Tirada posiciones={posiciones(7)} nombreTirada="Horseshoe Spread" etiqueta="H" carta={() => null} />);
    const arcos = screen.getAllByRole("listitem").map((li) => li.style.getPropertyValue("--arco"));
    expect(arcos).toEqual(["3", "2", "1", "0", "1", "2", "3"]);
  });
});

describe("<NewCardDiscoveredModal> en dos tintas (L2)", () => {
  it("muestra la carta autohospedada, no la de Wikimedia, y un cerrar con nombre", () => {
    const onClose = jest.fn();
    render(
      <NewCardDiscoveredModal
        isOpen
        onClose={onClose}
        cards={[{ ...card("major_6", "The Lovers", "Los Enamorados"), keywords: ["unión"], isReversed: false }]}
      />
    );
    const dialog = screen.getByRole("dialog", { name: "collection.newCard" });
    expect(within(dialog).getByRole("img", { name: "Los Enamorados" })).toHaveAttribute(
      "src",
      "/cartas/rws-tarot-06-lovers-color.webp"
    );
    within(dialog).getByRole("button", { name: "reading.close" }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
