import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecapPanel, type RecapMonth } from "@/components/insights/RecapPanel";

// next-intl is mocked in jest.setup.ts: t(key) returns the key, locale "es".

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Oldest first; the last one is the current month
const months: RecapMonth[] = [
  { year: 2026, month: 9, count: 5, label: "septiembre de 2026" },
  { year: 2026, month: 10, count: 3, label: "octubre de 2026" },
  { year: 2026, month: 11, count: 1, label: "noviembre de 2026" },
];

function respond(status: number, body: object) {
  mockFetch.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

describe("RecapPanel (F-54)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("starts on the newest month that can be written", () => {
    render(<RecapPanel months={months} initialRecaps={[]} />);

    expect(screen.getByRole("combobox")).toHaveValue("2026-10");
    expect(screen.getByRole("button", { name: "generate" })).toBeInTheDocument();
  });

  it("writes the month and shows it in paragraphs", async () => {
    respond(200, {
      recap: { year: 2026, month: 10, content: "Primer párrafo.\n\nSegundo párrafo.", readingCount: 3 },
      cached: false,
    });
    render(<RecapPanel months={months} initialRecaps={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "generate" }));

    await waitFor(() => expect(screen.getByText("Segundo párrafo.")).toBeInTheDocument());
    expect(screen.getByText("Primer párrafo.")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/insights/recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, month: 10, locale: "es" }),
    });
  });

  it("shows a saved recap without asking the server", () => {
    render(
      <RecapPanel
        months={months}
        initialRecaps={[{ year: 2026, month: 9, content: "Un septiembre de soltar.", readingCount: 5 }]}
      />
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2026-9" } });

    expect(screen.getByText("Un septiembre de soltar.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "generate" })).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("explains that a month needs 3 readings", () => {
    render(<RecapPanel months={months} initialRecaps={[]} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2026-11" } });

    expect(screen.getByText("needMore")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "generate" })).not.toBeInTheDocument();
  });

  it("offers an update when the current month has new readings", () => {
    const withCurrent = [...months.slice(0, 2), { year: 2026, month: 11, count: 4, label: "noviembre de 2026" }];
    render(
      <RecapPanel
        months={withCurrent}
        initialRecaps={[{ year: 2026, month: 11, content: "Noviembre va así.", readingCount: 3 }]}
      />
    );

    expect(screen.getByRole("combobox")).toHaveValue("2026-11");
    expect(screen.getByRole("button", { name: "update" })).toBeInTheDocument();
  });

  it("offers an update for a closed month whose recap was written before it ended (C-1)", () => {
    render(
      <RecapPanel
        months={months}
        initialRecaps={[{ year: 2026, month: 9, content: "Septiembre a medias.", readingCount: 3 }]}
      />
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2026-9" } });

    expect(screen.getByText("Septiembre a medias.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "update" })).toBeInTheDocument();
  });

  it("tells the person to try again when the AI is unavailable", async () => {
    respond(503, { error: "recap_unavailable", retry: true });
    render(<RecapPanel months={months} initialRecaps={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "generate" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("unavailable"));
    expect(screen.getByRole("button", { name: "generate" })).toBeInTheDocument();
  });
});
