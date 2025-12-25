/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/profile/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/zodiac", () => ({
  getZodiacSign: jest.fn().mockReturnValue("Aries"),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("GET /api/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns profile if authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "profile-1",
      userId: "user-123",
      fullName: "John Doe",
      zodiacSign: "Aries",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toBeDefined();
    expect(data.profile.fullName).toBe("John Doe");
  });

  it("returns null profile if not created", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toBeNull();
  });
});

describe("POST /api/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/profile", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest({
      fullName: "John Doe",
      birthDate: "1990-03-21",
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 if fullName is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const request = createRequest({
      birthDate: "1990-03-21",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 if birthDate is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const request = createRequest({
      fullName: "John Doe",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("creates profile successfully", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.userProfile.upsert as jest.Mock).mockResolvedValue({
      id: "profile-1",
      userId: "user-123",
      fullName: "John Doe",
      zodiacSign: "Aries",
      focusArea: "general",
      emailTime: "08:00",
    });

    const request = createRequest({
      fullName: "John Doe",
      birthDate: "1990-03-21",
      focusArea: "general",
      emailTime: "08:00",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toBeDefined();
    expect(data.profile.fullName).toBe("John Doe");
  });

  it("uses default values for optional fields", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    (mockPrisma.userProfile.upsert as jest.Mock).mockResolvedValue({
      id: "profile-1",
      fullName: "John Doe",
      focusArea: "general",
      emailTime: "08:00",
    });

    const request = createRequest({
      fullName: "John Doe",
      birthDate: "1990-03-21",
    });
    await POST(request);

    expect(mockPrisma.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          focusArea: "general",
          emailTime: "08:00",
        }),
      })
    );
  });
});
