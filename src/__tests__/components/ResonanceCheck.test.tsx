import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResonanceCheck } from "@/components/reading/ResonanceCheck";

// next-intl is mocked in jest.setup.ts: t(key) returns the key.

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const HOUR = 60 * 60 * 1000;
const isoHoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

const baseProps = {
  readingId: "reading-1",
  createdAt: isoHoursAgo(48),
  resonance: null,
  resonanceNote: null,
  locale: "es",
};

function respond(status: number, body: object) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("ResonanceCheck (F-52)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders nothing for a reading younger than 24 hours", () => {
    const { container } = render(<ResonanceCheck {...baseProps} createdAt={isoHoursAgo(23)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the date can't be read", () => {
    const { container } = render(<ResonanceCheck {...baseProps} createdAt="not a date" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the saved resonance and note, without the form", () => {
    render(
      <ResonanceCheck {...baseProps} createdAt={isoHoursAgo(1)} resonance={4} resonanceNote="Pasó tal cual." />
    );

    expect(screen.getAllByText("result").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "result" })).toBeInTheDocument();
    expect(screen.getByText(/Pasó tal cual\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "starLabel" })).not.toBeInTheDocument();
  });

  it("asks with five labelled star buttons once the reading is a day old", () => {
    render(<ResonanceCheck {...baseProps} />);

    expect(screen.getByRole("heading", { name: "question" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "starsGroup" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "starLabel" })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "submit" })).toBeDisabled();
  });

  it("marks the chosen star as pressed", () => {
    render(<ResonanceCheck {...baseProps} />);
    const stars = screen.getAllByRole("button", { name: "starLabel" });

    fireEvent.click(stars[2]);

    expect(stars[2]).toHaveAttribute("aria-pressed", "true");
    expect(stars[3]).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "submit" })).toBeEnabled();
  });

  it("posts the score and trimmed note, then thanks and shows the result", async () => {
    respond(200, { resonance: 4, resonanceNote: "Me ayudó", resonanceAt: new Date().toISOString(), xpAdded: 5 });
    render(<ResonanceCheck {...baseProps} />);

    fireEvent.click(screen.getAllByRole("button", { name: "starLabel" })[3]);
    fireEvent.change(screen.getByLabelText("noteLabel"), { target: { value: "  Me ayudó  " } });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("thanks"));
    expect(mockFetch).toHaveBeenCalledWith("/api/readings/reading-1/resonance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: 4, note: "Me ayudó" }),
    });
    expect(screen.getByText("xp")).toBeInTheDocument();
    expect(screen.getByText(/Me ayudó/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "starLabel" })).not.toBeInTheDocument();
  });

  it("sends no note when it's empty", async () => {
    respond(200, { resonance: 2, resonanceNote: null, xpAdded: 5 });
    render(<ResonanceCheck {...baseProps} />);

    fireEvent.click(screen.getAllByRole("button", { name: "starLabel" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ score: 2 });
  });

  it("shows an error and keeps the form when saving fails", async () => {
    respond(500, { error: "boom" });
    render(<ResonanceCheck {...baseProps} />);

    fireEvent.click(screen.getAllByRole("button", { name: "starLabel" })[4]);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("error"));
    expect(screen.getAllByRole("button", { name: "starLabel" })).toHaveLength(5);
  });

  it("says so when the reading was already rated", async () => {
    respond(409, { error: "already_rated" });
    render(<ResonanceCheck {...baseProps} />);

    fireEvent.click(screen.getAllByRole("button", { name: "starLabel" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("alreadySaved"));
  });

  it("caps the note at 500 characters", () => {
    render(<ResonanceCheck {...baseProps} />);
    const textarea = screen.getByLabelText("noteLabel") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "a".repeat(600) } });

    expect(textarea.value).toHaveLength(500);
  });
});
