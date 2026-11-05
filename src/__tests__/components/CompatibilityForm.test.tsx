import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompatibilityForm } from "@/components/compatibility/CompatibilityForm";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: mockRefresh, back: jest.fn(), prefetch: jest.fn() }),
}));

// jest.setup.ts mocks next-intl so t(key) returns the key.

const mockFetch = jest.fn();

const respond = (status: number, body: unknown) =>
  mockFetch.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });

const fill = (values: { name?: string; date?: string; fullName?: string }) => {
  if (values.name !== undefined) {
    fireEvent.change(screen.getByLabelText("form.partnerName"), { target: { value: values.name } });
  }
  if (values.date !== undefined) {
    fireEvent.change(screen.getByLabelText("form.partnerBirthDate"), { target: { value: values.date } });
  }
  if (values.fullName !== undefined) {
    fireEvent.change(screen.getByLabelText("form.partnerFullName"), { target: { value: values.fullName } });
  }
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: /form\.(submitAria|retry)/ }));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("CompatibilityForm", () => {
  it("shows the cost and the balance", () => {
    render(<CompatibilityForm credits={5} cost={2} />);
    expect(screen.getByText("form.cost")).toBeInTheDocument();
    expect(screen.getByText("form.balance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "form.submitAria" })).toBeEnabled();
    expect(screen.queryByText("form.notEnoughCredits")).not.toBeInTheDocument();
  });

  it("disables the submit and links to credits when the balance is short", () => {
    render(<CompatibilityForm credits={1} cost={2} />);
    expect(screen.getByRole("button", { name: "form.submitAria" })).toBeDisabled();
    expect(screen.getByText("form.notEnoughCredits")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "form.buyCredits" })).toHaveAttribute("href", "/credits");
  });

  it("asks for the birth date before calling the API", () => {
    render(<CompatibilityForm credits={5} cost={2} />);
    submit();
    expect(screen.getByText("errors.birthDateRequired")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects a birth date in the future", () => {
    render(<CompatibilityForm credits={5} cost={2} />);
    fill({ date: "2999-01-01" });
    submit();
    expect(screen.getByText("errors.birthDateFuture")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends the form and opens the new reading", async () => {
    respond(201, { reading: { id: "compat-1" } });
    render(<CompatibilityForm credits={5} cost={2} />);
    fill({ name: "  Ana ", date: "1992-03-03" });
    submit();

    expect(await screen.findByRole("status")).toHaveTextContent("form.loading");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/compatibility/compat-1"));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/compatibility");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ partnerName: "Ana", partnerBirthDate: "1992-03-03", locale: "es" });
  });

  it("on 503 says nothing was charged, keeps the values and offers a retry", async () => {
    respond(503, { error: "interpretation_unavailable", retry: true });
    render(<CompatibilityForm credits={5} cost={2} />);
    fill({ name: "Ana", date: "1992-03-03", fullName: "Ana Sofía Pérez" });
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("errors.unavailable");
    expect(screen.getByLabelText("form.partnerName")).toHaveValue("Ana");
    expect(screen.getByLabelText("form.partnerBirthDate")).toHaveValue("1992-03-03");
    expect(screen.getByLabelText("form.partnerFullName")).toHaveValue("Ana Sofía Pérez");

    respond(201, { reading: { id: "compat-2" } });
    fireEvent.click(screen.getByRole("button", { name: "form.retry" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/compatibility/compat-2"));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("on 403 links to buy credits", async () => {
    respond(403, { error: "insufficient_credits" });
    render(<CompatibilityForm credits={2} cost={2} />);
    fill({ date: "1992-03-03" });
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("errors.insufficientCredits");
    expect(screen.getByRole("link", { name: "form.buyCredits" })).toHaveAttribute("href", "/credits");
  });

  it("maps a server-side date error to the date field", async () => {
    respond(400, { error: "invalid_partner_birth_date", reason: "too_old" });
    render(<CompatibilityForm credits={5} cost={2} />);
    fill({ date: "1950-01-01" });
    submit();

    expect(await screen.findByText("errors.birthDateTooOld")).toBeInTheDocument();
  });

  it.each([
    [422, "errors.refused"],
    [429, "errors.rateLimited"],
    [500, "errors.generic"],
  ])("on %i shows %s", async (status, message) => {
    respond(status, {});
    render(<CompatibilityForm credits={5} cost={2} />);
    fill({ date: "1992-03-03" });
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it.each([502, 504])(
    "on %i can't tell whether the reading was saved: asks to check the list and refreshes it",
    async (status) => {
      respond(status, {});
      render(<CompatibilityForm credits={5} cost={2} />);
      fill({ date: "1992-03-03" });
      submit();

      expect(await screen.findByRole("alert")).toHaveTextContent("errors.unconfirmed");
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      // No retry invitation: the normal submit button stays
      expect(screen.getByRole("button", { name: "form.submitAria" })).toBeInTheDocument();
    }
  );

  it("when the connection drops, says it couldn't confirm and refreshes the list", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<CompatibilityForm credits={5} cost={2} />);
    fill({ date: "1992-03-03" });
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("errors.unconfirmed");
    expect(screen.queryByText("errors.generic")).not.toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("form.partnerBirthDate")).toHaveValue("1992-03-03");
  });
});
