import { render, screen, fireEvent } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";

jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock("@/components/SoundToggle", () => ({ SoundToggle: () => null }));

const mockUseSession = useSession as jest.Mock;

/** hrefs of the links whose text is `key` (the mocked translation), ignoring a leading emoji icon. */
const hrefs = (key: string) =>
  screen
    .queryAllByRole("link")
    .filter((a) => a.textContent?.replace(/^[^A-Za-z]+/, "") === key)
    .map((a) => a.getAttribute("href"));

describe("Header navigation (F-81)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  });

  it("desktop nav for a signed-in user: dashboard, new reading, daily card, calendar, history, in that order", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Ana", email: "ana@example.com", credits: 2, freeReadingsLeft: 0 } },
      status: "authenticated",
    });
    render(<Header />);

    const nav = screen.getByRole("navigation");
    const order = Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(order).toEqual(["/dashboard", "/reading/new", "/daily", "/calendar", "/history"]);
  });

  it("user menu adds Arcana Map, calendar, my story and reading for two next to the existing entries", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Ana", email: "ana@example.com", credits: 2, freeReadingsLeft: 0 } },
      status: "authenticated",
    });
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "openMenu" }));

    expect(hrefs("blueprint")).toEqual(["/blueprint"]);
    expect(hrefs("insights")).toEqual(["/history/insights"]);
    expect(hrefs("compatibility")).toEqual(["/compatibility"]);
    // calendar: desktop nav + user menu
    expect(hrefs("calendar")).toEqual(["/calendar", "/calendar"]);
    // the existing entries are still there
    for (const [key, href] of [
      ["dailyCard", "/daily"],
      ["collection", "/collection"],
      ["achievements", "/achievements"],
      ["challenges", "/challenges"],
      ["subscribe", "/subscribe"],
      ["profile", "/profile/setup"],
      ["referral", "/referral"],
      ["settings", "/settings"],
    ]) {
      expect(hrefs(key)).toContain(href);
    }
  });

  it("guests see the public calendar but none of the private pages", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<Header />);

    expect(hrefs("calendar")).toEqual(["/calendar"]);
    expect(hrefs("blueprint")).toEqual([]);
    expect(hrefs("compatibility")).toEqual([]);
    expect(hrefs("dashboard")).toEqual([]);
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/login");
  });
});
