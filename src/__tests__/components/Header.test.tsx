import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const ANA = {
  data: { user: { id: "u1", name: "Ana", email: "ana@example.com", credits: 2, freeReadingsLeft: 0 } },
  status: "authenticated",
};

describe("Header in two inks (F1-A)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  });

  it("is a sticky ink strip with the brand and the hour of the day", () => {
    mockUseSession.mockReturnValue(ANA);
    const { container } = render(<Header />);
    const header = container.querySelector("header")!;
    expect(header).toHaveClass("suelo-tinta", "sticky", "top-0");
    expect(header).not.toHaveClass("fixed");
    expect(screen.getByRole("link", { name: "Arcana" })).toHaveAttribute("href", "/");
    expect(header.querySelector('[data-variante="larga"]')).toHaveClass("lg:block");
    expect(header.querySelector('[data-variante="corta"]')).toHaveClass("lg:hidden");
  });

  it("the mobile menu opens from the keyboard, lists every page and traps focus", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue(ANA);
    render(<Header />);

    const boton = screen.getByRole("button", { name: "openNav" });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    boton.focus();
    await user.keyboard("{Enter}");

    const menu = screen.getByRole("dialog", { name: "navMenu" });
    expect(menu).toHaveClass("suelo-tinta", "fixed", "inset-0");
    expect(boton).toHaveAttribute("aria-expanded", "true");
    // focus starts on the close button
    expect(within(menu).getByRole("button", { name: "closeNav" })).toHaveFocus();

    const enlaces = within(menu)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    for (const href of [
      "/dashboard",
      "/reading/new",
      "/daily",
      "/calendar",
      "/history",
      "/blueprint",
      "/history/insights",
      "/compatibility",
      "/collection",
      "/achievements",
      "/challenges",
      "/subscribe",
      "/profile/setup",
      "/referral",
      "/settings",
      "/credits",
    ]) {
      expect(enlaces).toContain(href);
    }
    expect(within(menu).getByRole("button", { name: "logout" })).toBeInTheDocument();

    // what is behind the menu is hidden from assistive tech
    expect(screen.queryByRole("button", { name: "openNav" })).toBeNull();

    for (let i = 0; i < enlaces.length + 6; i++) {
      await user.tab();
      expect(menu).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(menu).toContainElement(document.activeElement as HTMLElement);
  });

  it("Esc closes the mobile menu and gives focus back to its button", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue(ANA);
    render(<Header />);

    const boton = screen.getByRole("button", { name: "openNav" });
    await user.click(boton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).toBe("");
  });

  it("the close button and a link both close the menu", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue(ANA);
    render(<Header />);

    await user.click(screen.getByRole("button", { name: "openNav" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "closeNav" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "openNav" }));
    // jsdom does not navigate: stop the anchor's default action after React handles the click
    const sinNavegar = (e: Event) => e.preventDefault();
    document.addEventListener("click", sinNavegar);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("link", { name: "history" }));
    document.removeEventListener("click", sinNavegar);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("guests get calendar, log in and sign up in the mobile menu, with a single log in link", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<Header />);

    await user.click(screen.getByRole("button", { name: "openNav" }));
    const menu = screen.getByRole("dialog");
    expect(within(menu).getByRole("link", { name: "calendar" })).toHaveAttribute("href", "/calendar");
    expect(within(menu).getByRole("link", { name: "register" })).toHaveAttribute("href", "/register");
    expect(within(menu).queryByRole("link", { name: "dashboard" })).toBeNull();
    // the header behind is hidden, so only the menu's log in link is reachable
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/login");
    expect(within(menu).getByRole("group", { name: "language" })).toBeInTheDocument();
  });

  it("Esc closes the desktop user menu and returns focus to the avatar button", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue(ANA);
    render(<Header />);

    const avatar = screen.getByRole("button", { name: "openMenu" });
    await user.click(avatar);
    expect(screen.getByRole("link", { name: "settings" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "settings" })).toBeNull();
    expect(avatar).toHaveFocus();
  });
});
