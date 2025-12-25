/**
 * @jest-environment node
 */
import { POST } from "@/app/api/auth/forgot-password/route";
import { NextRequest } from "next/server";

// Mock rate limit
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 9, resetIn: 60000 }),
  rateLimitResponse: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock crypto
jest.mock("crypto", () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue("mock-reset-token-123"),
  }),
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  it("returns 400 if email is missing", async () => {
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns success even if user does not exist (prevents email enumeration)", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest({ email: "nonexistent@example.com" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns success even if user has no password (OAuth only)", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "oauth@example.com",
      password: null, // OAuth user with no password
    });

    const request = createRequest({ email: "oauth@example.com" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Should not create token for OAuth users
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("creates reset token for valid user with password", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: "hashed_password",
    });
    (mockPrisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      token: "mock-reset-token-123",
    });

    const request = createRequest({ email: "user@example.com" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
  });

  it("deletes existing tokens before creating new one", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: "hashed_password",
    });
    (mockPrisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: "token-1",
    });

    const request = createRequest({ email: "user@example.com" });
    await POST(request);

    // Verify both operations were called
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
  });

  it("converts email to lowercase", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: "hashed_password",
    });
    (mockPrisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: "token-1",
    });

    const request = createRequest({ email: "USER@EXAMPLE.COM" });
    await POST(request);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
  });

  it("sets token expiration to 1 hour", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: "hashed_password",
    });
    (mockPrisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: "token-1",
    });

    const now = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(now);

    const request = createRequest({ email: "user@example.com" });
    await POST(request);

    const createCall = (mockPrisma.passwordResetToken.create as jest.Mock).mock
      .calls[0][0];
    const expires = new Date(createCall.data.expires).getTime();
    const oneHour = 3600000;

    expect(expires).toBe(now + oneHour);

    jest.restoreAllMocks();
  });
});
