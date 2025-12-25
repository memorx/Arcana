import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card", () => {
  it("renders with children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders with default variant", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("bg-slate-900/50");
  });

  it("renders with highlighted variant", () => {
    render(
      <Card variant="highlighted" data-testid="card">
        Highlighted
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("bg-gradient-to-br");
  });

  it("applies custom className", () => {
    render(
      <Card className="custom-class" data-testid="card">
        Content
      </Card>
    );
    expect(screen.getByTestId("card")).toHaveClass("custom-class");
  });
});

describe("CardHeader", () => {
  it("renders with children", () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("applies proper padding", () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    expect(screen.getByTestId("header")).toHaveClass("p-6");
  });
});

describe("CardTitle", () => {
  it("renders as h3 by default", () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("applies title styles", () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    expect(screen.getByTestId("title")).toHaveClass("text-xl", "font-semibold");
  });
});

describe("CardDescription", () => {
  it("renders with muted text", () => {
    render(<CardDescription>Description text</CardDescription>);
    const description = screen.getByText("Description text");
    expect(description).toHaveClass("text-slate-400");
  });
});

describe("CardContent", () => {
  it("renders with proper padding", () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    const content = screen.getByTestId("content");
    expect(content).toHaveClass("p-6", "pt-0");
  });
});

describe("CardFooter", () => {
  it("renders with flex layout", () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveClass("flex");
  });
});

describe("Card composition", () => {
  it("renders complete card with all parts", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a description</CardDescription>
        </CardHeader>
        <CardContent>Main content here</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );

    expect(screen.getByRole("heading", { name: "Test Card" })).toBeInTheDocument();
    expect(screen.getByText("This is a description")).toBeInTheDocument();
    expect(screen.getByText("Main content here")).toBeInTheDocument();
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });
});
