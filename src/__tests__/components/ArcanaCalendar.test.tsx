import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArcanaCalendar } from "@/components/calendar/ArcanaCalendar";

// next-intl is mocked in jest.setup.ts: t(key) returns the key, locale "es".

const TODAY = "2026-11-04"; // 13 Miquiztli (Death), waning moon

function mockCalendarApi(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body });
}

function day(name: RegExp) {
  return screen.getByRole("button", { name });
}

describe("ArcanaCalendar", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("shows the month with one labelled button per day and today selected", async () => {
    mockCalendarApi({ authenticated: false, birthDate: null });

    render(<ArcanaCalendar today={TODAY} />);

    expect(screen.getByRole("heading", { level: 2, name: "noviembre de 2026" })).toBeInTheDocument();
    const grid = screen.getByRole("grid");
    expect(within(grid).getAllByRole("button")).toHaveLength(30);

    const today = day(/^4 de noviembre, 13 Muerte, luna menguante/);
    expect(today).toHaveAttribute("aria-current", "date");
    expect(today).toHaveAttribute("tabindex", "0");
    expect(day(/^5 de noviembre,/)).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("heading", { name: "miércoles, 4 de noviembre de 2026" })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("detail.guestCta")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith("/api/calendar", expect.anything());
  });

  it("adds the personal day once the birth date arrives", async () => {
    mockCalendarApi({ authenticated: true, birthDate: "1990-07-15" });

    render(<ArcanaCalendar today={TODAY} />);

    await waitFor(() => expect(day(/^4 de noviembre,.*personalDayAria/)).toBeInTheDocument());
    // 1990-07-15 on 2026-11-04 → personal day 2 ("La alianza")
    expect(screen.getByText(/La alianza/)).toBeInTheDocument();
    expect(screen.queryByText("detail.guestCta")).not.toBeInTheDocument();
  });

  it("asks to complete the profile when signed in without a birth date", async () => {
    mockCalendarApi({ authenticated: true, birthDate: null });

    render(<ArcanaCalendar today={TODAY} />);

    await waitFor(() => expect(screen.getByText("detail.noProfileCta")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "detail.noProfileButton" })).toHaveAttribute(
      "href",
      "/profile/setup"
    );
  });

  it("leaves the personal day out if the birth date can't be loaded", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockCalendarApi({ error: "calendar_unavailable" }, false);

    render(<ArcanaCalendar today={TODAY} />);

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.queryByText("detail.personalDay")).not.toBeInTheDocument();
    // The calendar itself still works
    expect(day(/^4 de noviembre, 13 Muerte/)).toBeInTheDocument();
  });

  it("selects a day on click and shows its detail", async () => {
    mockCalendarApi({ authenticated: false, birthDate: null });
    const user = userEvent.setup();

    render(<ArcanaCalendar today={TODAY} />);
    await user.click(day(/^12 de noviembre,/));

    expect(day(/^12 de noviembre,/)).toHaveAttribute("tabindex", "0");
    expect(day(/^12 de noviembre,/).closest("td")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "jueves, 12 de noviembre de 2026" })).toBeInTheDocument();
  });

  it("moves through days and months with the keyboard", async () => {
    mockCalendarApi({ authenticated: false, birthDate: null });
    const user = userEvent.setup();

    render(<ArcanaCalendar today={TODAY} />);
    day(/^4 de noviembre,/).focus();

    await user.keyboard("{ArrowRight}");
    expect(day(/^5 de noviembre,/)).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(day(/^12 de noviembre,/)).toHaveFocus();

    await user.keyboard("{End}"); // weeks start on Monday in Spanish
    expect(day(/^15 de noviembre,/)).toHaveFocus();

    await user.keyboard("{Home}");
    expect(day(/^9 de noviembre,/)).toHaveFocus();

    await user.keyboard("{PageDown}");
    expect(screen.getByRole("heading", { level: 2, name: "diciembre de 2026" })).toBeInTheDocument();
    expect(day(/^9 de diciembre,/)).toHaveFocus();

    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("heading", { level: 2, name: "noviembre de 2026" })).toBeInTheDocument();
    expect(day(/^25 de noviembre,/)).toHaveFocus();
  });

  it("changes month with the buttons and goes back to today", async () => {
    mockCalendarApi({ authenticated: false, birthDate: null });
    const user = userEvent.setup();

    render(<ArcanaCalendar today={TODAY} />);

    await user.click(screen.getByRole("button", { name: "nextMonth" }));
    expect(screen.getByRole("heading", { level: 2, name: "diciembre de 2026" })).toBeInTheDocument();
    expect(within(screen.getByRole("grid")).getAllByRole("button")).toHaveLength(31);
    expect(day(/^4 de diciembre,/)).toHaveAttribute("tabindex", "0");

    await user.click(screen.getByRole("button", { name: "previousMonth" }));
    await user.click(screen.getByRole("button", { name: "previousMonth" }));
    expect(screen.getByRole("heading", { level: 2, name: "octubre de 2026" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "goToToday" }));
    expect(screen.getByRole("heading", { level: 2, name: "noviembre de 2026" })).toBeInTheDocument();
    expect(day(/^4 de noviembre,/)).toHaveAttribute("tabindex", "0");
  });
});
