import { fireEvent, render, screen } from "@testing-library/react";
import { TarotCard, TarotCardStatic } from "@/components/ui/TarotCard";
import { CardBack, CardPlaceholder } from "@/components/ui/CardPlaceholder";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; onError?: () => void }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} onError={props.onError} />;
  },
}));

const mockCard = {
  name: "The Fool",
  nameEs: "El Loco",
  arcana: "MAJOR" as const,
  suit: null,
  number: 0,
  imageUrl: "https://example.com/fool.jpg",
};

describe("TarotCard", () => {
  // Antes: la imagen salía de card.imageUrl (Wikimedia). Ahora: la carta autohospedada de cartaImagen().
  it("renders the self-hosted engraving (cartaImagen), not imageUrl", () => {
    render(<TarotCard card={mockCard} />);
    const img = screen.getByAltText("El Loco");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/cartas/rws-tarot-00-fool-color.webp");
  });

  it("shows the engraving even when imageUrl is missing (The Lovers no longer 404s)", () => {
    // A database row still carries imageUrl (null for The Lovers); the card ignores it.
    const enamorados = { ...mockCard, name: "The Lovers", nameEs: "Los Enamorados", number: 6, imageUrl: null };
    render(<TarotCard card={enamorados} />);
    expect(screen.getByAltText("Los Enamorados")).toHaveAttribute("src", "/cartas/rws-tarot-06-lovers-color.webp");
  });

  it("uses English name when locale is en", () => {
    render(<TarotCard card={mockCard} locale="en" />);
    expect(screen.getByAltText("The Fool")).toBeInTheDocument();
  });

  it("uses Spanish name when locale is es", () => {
    render(<TarotCard card={mockCard} locale="es" />);
    expect(screen.getByAltText("El Loco")).toBeInTheDocument();
  });

  // The badge label comes from next-intl (`reading.reversed`); jest.setup.ts mocks
  // useTranslations to return the key itself, so the rendered text is "reversed".
  it("shows reversed badge when card is reversed and revealed", () => {
    render(<TarotCard card={mockCard} isReversed={true} isRevealed={true} />);
    expect(screen.getByText("reversed")).toBeInTheDocument();
  });

  it("renders the reversed badge in mono (dos tintas)", () => {
    render(<TarotCard card={mockCard} isReversed={true} isRevealed={true} />);
    expect(screen.getByText("reversed")).toHaveClass("font-dato", "uppercase");
  });

  it("shows the translated reversed label when locale is en", () => {
    render(
      <TarotCard card={mockCard} isReversed={true} isRevealed={true} locale="en" />
    );
    expect(screen.getByText("reversed")).toBeInTheDocument();
    // what makes it the English case: the revealed reversed card is named in English
    expect(screen.getByAltText("The Fool")).toBeInTheDocument();
  });

  it("does not show reversed badge when showReversedBadge is false", () => {
    render(
      <TarotCard
        card={mockCard}
        isReversed={true}
        isRevealed={true}
        showReversedBadge={false}
      />
    );
    expect(screen.queryByText("reversed")).not.toBeInTheDocument();
  });

  it("does not show reversed badge when not revealed", () => {
    render(<TarotCard card={mockCard} isReversed={true} isRevealed={false} />);
    expect(screen.queryByText("reversed")).not.toBeInTheDocument();
  });

  it("the back of the card is the Arcana reverso", () => {
    const { container } = render(<TarotCard card={mockCard} isRevealed={false} />);
    expect(container.querySelector("svg.reverso-carta")).toBeInTheDocument();
    expect(container.querySelector('[style*="rotateY(180deg)"]')).toBeInTheDocument();
  });

  it("renders with different sizes", () => {
    const { rerender, container } = render(<TarotCard card={mockCard} size="sm" />);
    expect(container.querySelector(".w-16")).toBeInTheDocument();

    rerender(<TarotCard card={mockCard} size="md" />);
    expect(container.querySelector(".w-20")).toBeInTheDocument();

    rerender(<TarotCard card={mockCard} size="lg" />);
    expect(container.querySelector(".w-\\[120px\\]")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <TarotCard card={mockCard} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  // Antes: sin imageUrl salía el marcador. Ahora: el marcador sale si no es una de las 78 o si la imagen falla.
  it("renders placeholder when the card is not one of the 78", () => {
    render(<TarotCard card={{ ...mockCard, name: "The Joker", nameEs: "El Comodín" }} />);
    expect(screen.queryByRole("img", { name: "El Comodín" })).not.toBeInTheDocument();
    expect(screen.getByText("El Comodín")).toBeInTheDocument();
  });

  it("falls back to the placeholder when the image fails to load", () => {
    render(<TarotCard card={mockCard} />);
    fireEvent.error(screen.getByAltText("El Loco"));
    expect(screen.queryByAltText("El Loco")).not.toBeInTheDocument();
    expect(screen.getByText("El Loco")).toBeInTheDocument();
  });

  it("golden card: pink ember classes and the golden badge", () => {
    const { container } = render(<TarotCard card={mockCard} isGolden />);
    expect(container.querySelector(".golden-card-glow")).toBeInTheDocument();
    expect(container.querySelector(".golden-card-border")).toBeInTheDocument();
    expect(screen.getByText("golden")).toBeInTheDocument();
  });
});

describe("TarotCardStatic", () => {
  it("renders without animation", () => {
    render(<TarotCardStatic card={mockCard} />);
    expect(screen.getByAltText("El Loco")).toBeInTheDocument();
  });

  it("shows reversed badge when card is reversed", () => {
    render(<TarotCardStatic card={mockCard} isReversed={true} />);
    expect(screen.getByText("reversed")).toBeInTheDocument();
  });

  it("applies rotation when reversed", () => {
    const { container } = render(
      <TarotCardStatic card={mockCard} isReversed={true} />
    );
    const rotatedDiv = container.querySelector('[style*="rotate(180deg)"]');
    expect(rotatedDiv).toBeInTheDocument();
  });

  it("does not apply rotation when not reversed", () => {
    const { container } = render(
      <TarotCardStatic card={mockCard} isReversed={false} />
    );
    const rotatedDiv = container.querySelector('[style*="rotate(0deg)"]');
    expect(rotatedDiv).toBeInTheDocument();
  });

  it("uses the self-hosted engraving for minor arcana too", () => {
    render(
      <TarotCardStatic
        card={{ name: "Two of Cups", nameEs: "Dos de Copas", arcana: "MINOR", suit: "CUPS", number: 2 }}
      />
    );
    expect(screen.getByAltText("Dos de Copas")).toHaveAttribute("src", "/cartas/cups02-color.webp");
  });
});

describe("CardPlaceholder and CardBack", () => {
  it("placeholder shows the numeral and the name, without emoji", () => {
    const { container } = render(
      <CardPlaceholder cardName="Rey de Oros" arcana="MINOR" suit="PENTACLES" number={14} />
    );
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.getByText("Rey de Oros")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("card back is the decorative reverso", () => {
    const { container } = render(<CardBack className="w-20" />);
    const svg = container.querySelector("svg.reverso-carta");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.firstChild).toHaveClass("w-20");
  });
});
