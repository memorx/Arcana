import { render, screen, waitFor } from "@testing-library/react";

jest.mock("@/components/energies/TodayEnergies", () => ({
  TodayEnergies: jest.fn(() => null),
}));

import DailyPage from "@/app/(main)/daily/page";
import { TodayEnergies } from "@/components/energies/TodayEnergies";
import { todayUtc } from "@/lib/systems";

// next-intl is mocked in jest.setup.ts: t(key) returns the key.

const mockTodayEnergies = TodayEnergies as unknown as jest.Mock;

function mockApis(profile: Record<string, unknown> | null) {
  const bodies: Record<string, unknown> = {
    "/api/subscription": {
      subscription: { status: "active", freeReadingsUsed: 0, freeReadingsPerMonth: 1 },
    },
    "/api/daily-reading": { today: null, recent: [] },
    "/api/profile": { profile },
  };
  global.fetch = jest.fn(async (url: string) => ({ ok: true, json: async () => bodies[url] })) as jest.Mock;
}

describe("/daily: today's energies", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockTodayEnergies.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("mounts TodayEnergies with today and the profile's birth date", async () => {
    mockApis({ emailTime: "09:00", birthDate: "1990-07-15T00:00:00.000Z" });

    render(<DailyPage />);

    await waitFor(() => expect(mockTodayEnergies).toHaveBeenCalled());
    const props = mockTodayEnergies.mock.calls.at(-1)![0];
    expect(props.birthDate).toBeInstanceOf(Date);
    expect(props.birthDate.toISOString()).toBe("1990-07-15T00:00:00.000Z");
    expect(props.date.toISOString()).toBe(todayUtc().toISOString());
    // Above today's card
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("noCardYet")).toBeInTheDocument();
  });

  it("passes no birth date when the profile has none", async () => {
    mockApis(null);

    render(<DailyPage />);

    await waitFor(() => expect(mockTodayEnergies).toHaveBeenCalled());
    expect(mockTodayEnergies.mock.calls.at(-1)![0].birthDate).toBeNull();
  });
});
