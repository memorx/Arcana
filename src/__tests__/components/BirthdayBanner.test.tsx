import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.values(values).join(",")})` : key
  ),
}));

jest.mock("@/lib/birthday", () => ({
  claimBirthdayGift: jest.fn(),
}));

import { BirthdayBanner } from "@/components/dashboard/BirthdayBanner";
import { claimBirthdayGift } from "@/lib/birthday";

const mockClaim = claimBirthdayGift as jest.Mock;

describe("BirthdayBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders nothing the rest of the year", async () => {
    mockClaim.mockResolvedValue({ granted: false, alreadyGranted: false, credits: 3, isBirthday: false });

    expect(await BirthdayBanner({ userId: "user-1" })).toBeNull();
    expect(mockClaim).toHaveBeenCalledWith("user-1");
  });

  it("greets and announces the gift when it was just granted", async () => {
    mockClaim.mockResolvedValue({ granted: true, alreadyGranted: false, credits: 3, isBirthday: true });

    render((await BirthdayBanner({ userId: "user-1" }))!);

    expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.getByText("granted(3)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "cta" })).toHaveAttribute("href", "/reading/new");
  });

  it("still greets on the birthday when the gift was already claimed", async () => {
    mockClaim.mockResolvedValue({ granted: false, alreadyGranted: true, credits: 3, isBirthday: true });

    render((await BirthdayBanner({ userId: "user-1" }))!);

    expect(screen.getByText("alreadyGranted(3)")).toBeInTheDocument();
    expect(screen.queryByText("granted(3)")).not.toBeInTheDocument();
  });

  it("greets without mentioning credits when the account is too new for the gift", async () => {
    mockClaim.mockResolvedValue({ granted: false, alreadyGranted: false, credits: 3, isBirthday: true });

    render((await BirthdayBanner({ userId: "user-1" }))!);

    expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.getByText("greetingOnly")).toBeInTheDocument();
    expect(screen.queryByText(/granted/i)).not.toBeInTheDocument();
  });

  it("renders nothing if the gift can't be claimed", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockClaim.mockRejectedValue(new Error("db down"));

    expect(await BirthdayBanner({ userId: "user-1" })).toBeNull();
  });
});
