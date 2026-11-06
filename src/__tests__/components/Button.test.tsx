import { render, screen, fireEvent } from "@testing-library/react";
import { Button, buttonClasses } from "@/components/ui/button";

describe("Button", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("renders with primary variant by default: rosa-luz with tinta letters", () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-rosa-luz", "text-tinta");
  });

  it("is set in mono uppercase with tracking, as a pill", () => {
    render(<Button>Mono</Button>);
    expect(screen.getByRole("button")).toHaveClass("font-dato", "uppercase", "tracking-[0.1em]", "rounded-full");
  });

  it("the 2 px hover lift slides: Tailwind 4's -translate-y-* sets `translate`, so the transition lists it", () => {
    for (const clases of [buttonClasses(), buttonClasses({ variant: "linea", size: "lg" })]) {
      const lista = clases.split(" ");
      expect(lista).toContain("hover:-translate-y-0.5");
      const transicion = lista.find((c) => c.startsWith("transition-["));
      expect(transicion?.slice("transition-[".length, -1).split(",")).toEqual(
        expect.arrayContaining(["translate", "background-color", "color", "border-color"])
      );
    }
  });

  it("renders with secondary variant (alias of linea): a rule in the letter color of its ground", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-transparent", "border-current");
  });

  it("renders with ghost variant (alias of fantasma)", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-transparent");
    expect(button).not.toHaveClass("border-current");
  });

  it("renders with danger variant (alias of peligro)", () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-error", "text-papel");
  });

  it("old variant names and the new ones give the same classes", () => {
    for (const [viejo, nuevo] of [
      ["primary", "primario"],
      ["secondary", "linea"],
      ["ghost", "fantasma"],
      ["danger", "peligro"],
    ] as const) {
      expect(buttonClasses({ variant: viejo })).toBe(buttonClasses({ variant: nuevo }));
    }
  });

  it("renders with different sizes, all at least 44 px tall", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("min-h-11", "px-4");

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole("button")).toHaveClass("min-h-12", "px-6");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("min-h-14", "px-8");
  });

  it("buttonClasses lets a link look like a button", () => {
    const clases = buttonClasses({ variant: "linea", size: "lg", className: "w-full" });
    expect(clases).toContain("border-current");
    expect(clases).toContain("min-h-14");
    expect(clases).toContain("w-full");
  });

  it("shows loading state", () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
    // Check for spinner SVG
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("does not call onClick when loading", () => {
    const handleClick = jest.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Loading
      </Button>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders as different element types", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });
});
