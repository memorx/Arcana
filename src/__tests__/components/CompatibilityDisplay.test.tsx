import { render, screen, within } from "@testing-library/react";
import { CompatibilityCards } from "@/components/compatibility/CompatibilityCards";
import { CompatibilityHistory } from "@/components/compatibility/CompatibilityHistory";
import { CompatibilityMeters } from "@/components/compatibility/CompatibilityMeters";
import { ReadingText } from "@/components/compatibility/ReadingText";
import { ScoreMeter } from "@/components/compatibility/ScoreMeter";
import { CARD_ROLES, computeCompatibility, type CompatibilityCard } from "@/lib/compatibility";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; className?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} className={props.className} />;
  },
}));

// jest.setup.ts mocks next-intl so t(key) returns the key.

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("ScoreMeter", () => {
  it("fills as many segments as the score and exposes it as a meter", () => {
    const { container } = render(
      <ScoreMeter label="Zodiaco chino" score={4} scoreText="4/5" ariaLabel="Zodiaco chino: 4 de 5" />
    );
    const meter = screen.getByRole("meter", { name: "Zodiaco chino: 4 de 5" });
    expect(meter).toHaveAttribute("aria-valuenow", "4");
    expect(meter).toHaveAttribute("aria-valuemin", "1");
    expect(meter).toHaveAttribute("aria-valuemax", "5");
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-filled="false"]')).toHaveLength(1);
    expect(screen.getByText("Zodiaco chino")).toBeInTheDocument();
  });

  it("clamps scores outside 1–5", () => {
    const { container } = render(<ScoreMeter label="x" score={9} scoreText="9" ariaLabel="x" />);
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(5);
  });
});

describe("CompatibilityMeters", () => {
  const systems = computeCompatibility(
    { birthDate: utc(1984, 6, 1), fullName: "John Smith" },
    { birthDate: utc(1988, 6, 1), fullName: "John Smith" }
  );

  it("shows five meters: overall and the four systems, with their scores", () => {
    render(<CompatibilityMeters systems={systems} locale="es" />);
    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(5);
    expect(meters.map((m) => Number(m.getAttribute("aria-valuenow")))).toEqual([
      systems.overall,
      systems.western.score,
      systems.chinese.score,
      systems.numerology.score,
      systems.tonalli.score,
    ]);
    for (const key of ["overall", "western", "chinese", "numerology", "tonalli"]) {
      expect(screen.getByText(`systems.${key}`)).toBeInTheDocument();
    }
  });

  it("writes the pairs and summaries in the requested language", () => {
    const { rerender } = render(<CompatibilityMeters systems={systems} locale="es" />);
    expect(screen.getByText(systems.chinese.summary.es)).toBeInTheDocument();
    expect(screen.getByText(systems.overallLabel.es)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(systems.chinese.a.label.es))).toBeInTheDocument();

    rerender(<CompatibilityMeters systems={systems} locale="en" />);
    expect(screen.getByText(systems.chinese.summary.en)).toBeInTheDocument();
    expect(screen.getByText(systems.numerology.summary.en)).toBeInTheDocument();
  });

  it("mentions the name numerology only when it was computed", () => {
    render(<CompatibilityMeters systems={systems} locale="es" />);
    expect(screen.getByText(/numerology\.names/)).toBeInTheDocument();

    const withoutNames = computeCompatibility({ birthDate: utc(1984, 6, 1) }, { birthDate: utc(1988, 6, 1) });
    render(<CompatibilityMeters systems={withoutNames} locale="es" />);
    expect(screen.getAllByText(/numerology\.names/)).toHaveLength(1);
  });
});

describe("CompatibilityCards", () => {
  const cards: CompatibilityCard[] = CARD_ROLES.map((r, i) => ({
    position: i + 1,
    role: r.role,
    roleLabel: r.label,
    cardId: `major_${i}`,
    isReversed: i === 2,
    name: ["The Magician", "The Moon", "The Lovers"][i],
    nameEs: ["El Mago", "La Luna", "Los Enamorados"][i],
    imageUrl: `/cards/${i}.jpg`,
    arcana: "MAJOR",
    suit: null,
    number: i,
  }));

  it("shows the three cards with their roles", () => {
    render(<CompatibilityCards cards={cards} partnerName={null} locale="es" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("roles.me")).toBeInTheDocument();
    expect(within(items[1]).getByText("roles.partner")).toBeInTheDocument();
    expect(within(items[2]).getByText("roles.bond")).toBeInTheDocument();
    expect(within(items[1]).getByText("La Luna")).toBeInTheDocument();
    expect(within(items[1]).getAllByAltText("La Luna").length).toBeGreaterThan(0);
  });

  it("uses the partner's name for their card", () => {
    render(<CompatibilityCards cards={cards} partnerName="Ana" locale="en" />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[1]).getByText("Ana")).toBeInTheDocument();
    expect(within(items[1]).getByText("The Moon")).toBeInTheDocument();
  });
});

describe("ReadingText", () => {
  it("renders section titles as headings and the rest as paragraphs", () => {
    render(<ReadingText content={"Cómo se encuentran\n\nUn párrafo con punto final.\n\nQué cuidar\n\nOtro párrafo."} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Cómo se encuentran",
      "Qué cuidar",
    ]);
    expect(screen.getByText("Un párrafo con punto final.").tagName).toBe("P");
  });
});

describe("CompatibilityHistory", () => {
  it("shows an empty state", () => {
    render(<CompatibilityHistory readings={[]} locale="es" />);
    expect(screen.getByText("previous.empty")).toBeInTheDocument();
  });

  it("links each reading with its overall score", () => {
    render(
      <CompatibilityHistory
        locale="es"
        readings={[
          { id: "c2", partnerName: "Ana", partnerBirthDate: "1992-03-03", overall: 4, createdAt: "2026-11-05T12:00:00Z" },
          { id: "c1", partnerName: null, partnerBirthDate: "1988-08-08", overall: null, createdAt: "2026-11-01T12:00:00Z" },
        ]}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/compatibility/c2", "/compatibility/c1"]);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("previous.noName")).toBeInTheDocument();
    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(1);
    expect(meters[0]).toHaveAttribute("aria-valuenow", "4");
  });
});

describe("Dos tintas", () => {
  const cards: CompatibilityCard[] = CARD_ROLES.map((r, i) => ({
    position: i + 1,
    role: r.role,
    roleLabel: r.label,
    cardId: `major_${i}`,
    isReversed: i === 2,
    name: ["The Magician", "The Moon", "The Lovers"][i],
    nameEs: ["El Mago", "La Luna", "Los Enamorados"][i],
    imageUrl: `/cards/${i}.jpg`,
    arcana: "MAJOR",
    suit: null,
    number: i,
  }));

  it("the three cards are the self-hosted color engravings (never the stored imageUrl), the reversed one turned", () => {
    render(<CompatibilityCards cards={cards} partnerName={null} locale="es" />);
    const [me, partner, bond] = screen.getAllByRole("listitem");
    expect(within(me).getByAltText("El Mago")).toHaveAttribute("src", "/cartas/rws-tarot-01-magician-color.webp");
    expect(within(partner).getByAltText("La Luna")).toHaveAttribute("src", "/cartas/rws-tarot-18-moon-color.webp");
    const enamorados = within(bond).getByAltText("Los Enamorados");
    expect(enamorados).toHaveAttribute("src", "/cartas/rws-tarot-06-lovers-color.webp");
    expect(enamorados).toHaveClass("rotate-180");
    expect(within(bond).getByText("invertida")).toBeInTheDocument();
    expect(within(me).queryByText("invertida")).not.toBeInTheDocument();
    expect(document.querySelectorAll('img[src^="/cards/"]')).toHaveLength(0);
  });

  it("a meter prints its value: filled segments in pink, empty ones outlined, the score in mono for sight only", () => {
    const { container } = render(
      <ScoreMeter label="Numerología" score={2} scoreText="2/5" ariaLabel="Numerología: 2 de 5" />
    );
    const meter = screen.getByRole("meter", { name: "Numerología: 2 de 5" });
    const llenos = meter.querySelectorAll('[data-filled="true"]');
    const vacios = meter.querySelectorAll('[data-filled="false"]');
    expect(llenos).toHaveLength(2);
    expect(vacios).toHaveLength(3);
    llenos.forEach((s) => expect(s).toHaveClass("bg-rosa"));
    vacios.forEach((s) => expect(s).not.toHaveClass("bg-rosa"));
    const valor = container.querySelector("[data-valor]");
    expect(valor).toHaveTextContent("2/5");
    expect(valor).toHaveAttribute("aria-hidden", "true");
  });

  it("every meter of a reading has its spoken value, and the glyphs of the pairs are in one ink", () => {
    const systems = computeCompatibility({ birthDate: utc(1990, 7, 15) }, { birthDate: utc(1992, 3, 3) });
    const { container } = render(<CompatibilityMeters systems={systems} locale="es" />);
    for (const meter of screen.getAllByRole("meter")) {
      const valor = Number(meter.getAttribute("aria-valuenow"));
      expect(valor).toBeGreaterThanOrEqual(1);
      expect(valor).toBeLessThanOrEqual(5);
      expect(meter).toHaveAccessibleName("meterAria");
      expect(meter.querySelectorAll('[data-filled="true"]')).toHaveLength(valor);
    }
    const glifos = container.querySelectorAll("[data-glifo]");
    expect(glifos.length).toBe(6);
    glifos.forEach((g) => expect(g).toHaveClass("grayscale"));
  });

  it("the archive row keeps its meter and links to the reading", () => {
    render(
      <CompatibilityHistory
        locale="es"
        readings={[{ id: "c9", partnerName: "Luis", partnerBirthDate: "1988-11-02", overall: 3, createdAt: "2026-11-03T12:00:00Z" }]}
      />
    );
    const link = screen.getByRole("link", { name: /Luis/ });
    expect(link).toHaveAttribute("href", "/compatibility/c9");
    const meter = within(link).getByRole("meter");
    expect(meter.querySelectorAll('[data-filled="true"]')).toHaveLength(3);
  });
});
