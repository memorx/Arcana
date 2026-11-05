/**
 * @jest-environment node
 */
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: jest.fn() },
  },
}));

import { GET } from "@/app/api/calendar/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindProfile = prisma.userProfile.findUnique as jest.Mock;

describe("GET /api/calendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("works for guests without touching the database", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false, birthDate: null });
    expect(mockFindProfile).not.toHaveBeenCalled();
  });

  it("returns null without a profile", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindProfile.mockResolvedValue(null);

    const response = await GET();

    expect(await response.json()).toEqual({ authenticated: true, birthDate: null });
    expect(mockFindProfile).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { birthDate: true },
    });
  });

  it("returns only the UTC day of the birth date", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    // Stored at 00:00 UTC; in Mexico City (the test runner's zone) it's still July 14
    mockFindProfile.mockResolvedValue({ birthDate: new Date("1990-07-15T00:00:00.000Z") });

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ authenticated: true, birthDate: "1990-07-15" });
    expect(Object.keys(body)).toEqual(["authenticated", "birthDate"]);
  });

  it("is never cached", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindProfile.mockResolvedValue(null);

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("answers 500 when the database fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindProfile.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "calendar_unavailable" });
  });
});
