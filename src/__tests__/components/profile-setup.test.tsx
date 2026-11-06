import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileSetupPage from "@/app/(main)/profile/setup/page";

// jest.config.ts fixes TZ to America/Mexico_City (UTC−6): the case where
// reading local date fields turned "1990-03-21" into March 20th (Pisces).

const mockFetch = (opts: { birthDate?: string; subscriptionStatus?: string }) => {
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    if (url === "/api/profile" && init?.method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: {} }) });
    }
    if (url === "/api/profile") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            profile: opts.birthDate
              ? {
                  fullName: "Ana López",
                  birthDate: opts.birthDate,
                  birthTime: null,
                  focusArea: "general",
                  emailTime: "08:00",
                  zodiacSign: "Pisces",
                }
              : null,
          }),
      });
    }
    if (url === "/api/subscription") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: opts.subscriptionStatus ? { status: opts.subscriptionStatus } : null,
          }),
      });
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  }) as jest.Mock;
};

describe("Profile setup", () => {
  it("previews the sign from the UTC day (21 March → Aries, not Pisces)", async () => {
    mockFetch({ birthDate: "1990-03-21T00:00:00.000Z" });
    render(<ProfileSetupPage />);

    expect(await screen.findByText("Aries")).toBeInTheDocument();
    expect(screen.queryByText("Piscis")).not.toBeInTheDocument();
  });

  it("updates the sign when the date changes at a cusp", async () => {
    mockFetch({ birthDate: "1990-03-21T00:00:00.000Z" });
    const { container } = render(<ProfileSetupPage />);
    await screen.findByText("Aries");

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "1990-03-20" } });
    expect(await screen.findByText("Piscis")).toBeInTheDocument();
  });

  it("after saving it stays on the page and offers the Arcana Map next to subscribing", async () => {
    mockFetch({ birthDate: "1990-07-15T00:00:00.000Z" });
    render(<ProfileSetupPage />);
    await screen.findByText("Cáncer");

    fireEvent.click(screen.getByRole("button", { name: "save" }));

    const mapLink = await screen.findByRole("link", { name: "viewMap" });
    expect(mapLink).toHaveAttribute("href", "/blueprint");
    expect(screen.getByRole("link", { name: "continue" })).toHaveAttribute("href", "/subscribe");
    expect(screen.getByRole("link", { name: "dashboard" })).toHaveAttribute("href", "/dashboard");
    await waitFor(() => expect(screen.getByRole("region", { name: /readyTitle/ })).toHaveFocus());
  });

  it("does not offer to subscribe when the subscription is already active", async () => {
    mockFetch({ birthDate: "1990-07-15T00:00:00.000Z", subscriptionStatus: "active" });
    render(<ProfileSetupPage />);
    await screen.findByText("Cáncer");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/subscription"));

    fireEvent.click(screen.getByRole("button", { name: "save" }));

    expect(await screen.findByRole("link", { name: "viewMap" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "continue" })).not.toBeInTheDocument();
  });

  it("every field has its own id and label, and the option groups say which one is pressed", async () => {
    mockFetch({ birthDate: "1990-07-15T00:00:00.000Z" });
    render(<ProfileSetupPage />);
    await screen.findByText("Cáncer");

    expect(screen.getByLabelText("fullName")).toHaveAttribute("id", "profile-fullName");
    expect(screen.getByLabelText("birthDate")).toHaveAttribute("id", "profile-birthDate");
    expect(screen.getByLabelText("birthTime")).toHaveAttribute("id", "profile-birthTime");
    // The birth time help is visible text tied to the field, not a hover tooltip.
    expect(screen.getByLabelText("birthTime")).toHaveAccessibleDescription("birthTimeTooltip");

    const general = screen.getByRole("button", { name: "Guía General" });
    const amor = screen.getByRole("button", { name: "Amor y Relaciones" });
    expect(general).toHaveAttribute("aria-pressed", "true");
    expect(amor).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(amor);
    expect(amor).toHaveAttribute("aria-pressed", "true");
    expect(general).toHaveAttribute("aria-pressed", "false");

    expect(screen.getByRole("group", { name: "emailTime" })).toBeInTheDocument();
    expect(screen.getByText("emailTimeUtc")).toBeInTheDocument();
  });
});
