import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { FollowUpChat, type FollowUpItem } from "@/components/reading/FollowUpChat";

// Append the values to the key so counters and costs are visible in the output.
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${Object.values(values).join(" ")}` : key,
  useLocale: () => "es",
}));

const item = (n: number, creditsCharged = n === 1 ? 0 : 1): FollowUpItem => ({
  id: `fu-${n}`,
  question: `Pregunta ${n}`,
  answer: `Primer párrafo ${n}.\n\nSegundo párrafo ${n}.`,
  creditsCharged,
  createdAt: "2026-11-05T12:00:00.000Z",
});

const mockFetch = jest.fn();

const renderChat = (followUps: FollowUpItem[], credits = 3) =>
  render(<FollowUpChat readingId="reading-1" initialFollowUps={followUps} credits={credits} locale="es" />);

const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText("yourQuestion"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /^(submit|submitPaid|retry)/ }));
};

describe("FollowUpChat (F-64)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it("shows the earlier questions and answers, and the counter", () => {
    renderChat([item(1), item(2)]);

    expect(screen.getByText("Pregunta 1")).toBeInTheDocument();
    expect(screen.getByText("Primer párrafo 2.")).toBeInTheDocument();
    expect(screen.getByText("Segundo párrafo 2.")).toBeInTheDocument();
    expect(screen.getByText("counter 2 5")).toBeInTheDocument();
  });

  it("says the first question is free", () => {
    renderChat([]);

    expect(screen.getByText("costFree")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "submit" })).toBeDisabled();
  });

  it("warns that the second question costs 1 credit before sending it", () => {
    renderChat([item(1)], 3);

    expect(screen.getByText("costPaid 1 3")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("yourQuestion"), { target: { value: "¿Y ahora?" } });
    expect(screen.getByRole("button", { name: "submitPaid 1" })).toBeEnabled();
  });

  it("sends the question, shows a loading state and appends the answer", async () => {
    let resolve!: (value: unknown) => void;
    mockFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    renderChat([item(1)], 3);

    ask("  ¿Qué me pide El Ermitaño?  ");

    expect(await screen.findByText("sending")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/readings/reading-1/followup", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ question: "¿Qué me pide El Ermitaño?", locale: "es" });

    resolve({
      ok: true,
      status: 201,
      json: async () => ({
        followUp: { ...item(2), question: "¿Qué me pide El Ermitaño?", answer: "Te pide una pausa." },
        limit: 5,
        remaining: 3,
        nextCost: 1,
      }),
    });

    expect(await screen.findByText("Te pide una pausa.")).toBeInTheDocument();
    expect(screen.getByText("counter 2 5")).toBeInTheDocument();
    expect(screen.getByLabelText("yourQuestion")).toHaveValue("");
    // 3 credits − 1
    expect(screen.getByText("costPaid 1 2")).toBeInTheDocument();
  });

  it("keeps the question and offers a retry when the AI is unavailable (503)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "interpretation_unavailable", retry: true }) });
    renderChat([]);

    ask("¿Qué hago con esto?");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("errors.unavailable 5")).toBeInTheDocument();
    expect(screen.getByLabelText("yourQuestion")).toHaveValue("¿Qué hago con esto?");
    expect(screen.getByRole("button", { name: "retry" })).toBeEnabled();
  });

  it("links to /credits when the question can't be paid (403)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "insufficient_credits" }) });
    renderChat([item(1)], 1);

    ask("¿Y en el amor?");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("errors.credits 5")).toBeInTheDocument();
    expect(within(alert).getByRole("link", { name: /buyCredits/ })).toHaveAttribute("href", "/credits");
  });

  it("doesn't let you send a paid question without credits and links to /credits", () => {
    renderChat([item(1)], 0);

    fireEvent.change(screen.getByLabelText("yourQuestion"), { target: { value: "¿Y en el amor?" } });

    expect(screen.getByRole("button", { name: "submitPaid 1" })).toBeDisabled();
    expect(screen.getByText("noCredits")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buyCredits/ })).toHaveAttribute("href", "/credits");
  });

  it("hides the form after the fifth question", () => {
    renderChat([1, 2, 3, 4, 5].map((n) => item(n)));

    expect(screen.getByText("counter 5 5")).toBeInTheDocument();
    expect(screen.getByText("limitReached 5")).toBeInTheDocument();
    expect(screen.queryByLabelText("yourQuestion")).not.toBeInTheDocument();
  });

  it("reloads the list when the server says the limit was reached (409)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "followup_limit" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ followUps: [1, 2, 3, 4, 5].map((n) => item(n)) }) });
    renderChat([1, 2, 3, 4].map((n) => item(n)), 5);

    ask("¿Una más?");

    await waitFor(() => expect(mockFetch).toHaveBeenLastCalledWith("/api/readings/reading-1/followup"));
    expect(await screen.findByText("limitReached 5")).toBeInTheDocument();
  });
});
