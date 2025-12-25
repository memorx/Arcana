import { render, screen } from "@testing-library/react";
import { TarotCard, TarotCardStatic } from "@/components/ui/TarotCard";

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
  it("renders with card image when imageUrl is provided", () => {
    render(<TarotCard card={mockCard} />);
    const img = screen.getByAltText("El Loco");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", mockCard.imageUrl);
  });

  it("uses English name when locale is en", () => {
    render(<TarotCard card={mockCard} locale="en" />);
    expect(screen.getByAltText("The Fool")).toBeInTheDocument();
  });

  it("uses Spanish name when locale is es", () => {
    render(<TarotCard card={mockCard} locale="es" />);
    expect(screen.getByAltText("El Loco")).toBeInTheDocument();
  });

  it("shows reversed badge when card is reversed and revealed", () => {
    render(<TarotCard card={mockCard} isReversed={true} isRevealed={true} />);
    expect(screen.getByText("Invertida")).toBeInTheDocument();
  });

  it("shows English reversed text when locale is en", () => {
    render(
      <TarotCard card={mockCard} isReversed={true} isRevealed={true} locale="en" />
    );
    expect(screen.getByText("Reversed")).toBeInTheDocument();
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
    expect(screen.queryByText("Invertida")).not.toBeInTheDocument();
    expect(screen.queryByText("Reversed")).not.toBeInTheDocument();
  });

  it("does not show reversed badge when not revealed", () => {
    render(<TarotCard card={mockCard} isReversed={true} isRevealed={false} />);
    expect(screen.queryByText("Invertida")).not.toBeInTheDocument();
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

  it("renders placeholder when no imageUrl", () => {
    const cardWithoutImage = { ...mockCard, imageUrl: null };
    render(<TarotCard card={cardWithoutImage} />);
    // Should show placeholder with card name
    expect(screen.getByText("El Loco")).toBeInTheDocument();
  });
});

describe("TarotCardStatic", () => {
  it("renders without animation", () => {
    render(<TarotCardStatic card={mockCard} />);
    expect(screen.getByAltText("El Loco")).toBeInTheDocument();
  });

  it("shows reversed badge when card is reversed", () => {
    render(<TarotCardStatic card={mockCard} isReversed={true} />);
    expect(screen.getByText("Invertida")).toBeInTheDocument();
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
});
