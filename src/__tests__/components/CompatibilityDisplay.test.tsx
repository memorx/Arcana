import { render, screen, within } from "@testing-library/react";
import { CompatibilityCards } from "@/components/compatibility/CompatibilityCards";
import { CompatibilityHistory } from "@/components/compatibility/CompatibilityHistory";
import { CompatibilityMeters } from "@/components/compatibility/CompatibilityMeters";
import { ReadingText } from "@/components/compatibility/ReadingText";
import { ScoreMeter } from "@/components/compatibility/ScoreMeter";
import { CARD_ROLES, computeCompatibility, type CompatibilityCard } from "@/lib/compatibility";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} />;
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
