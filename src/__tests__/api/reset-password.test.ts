/**
 * @jest-environment node
 */
import { POST } from "@/app/api/auth/reset-password/route";
import { NextRequest } from "next/server";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("new_hashed_password"),
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  it("returns 400 if token is missing", async () => {
    const request = createRequest({ password: "newpassword123" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 if password is missing", async () => {
    const request = createRequest({ token: "valid-token" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 if password is too short", async () => {
    const request = createRequest({ token: "valid-token", password: "12345" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("6");
  });

  it("returns 400 if token is invalid", async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(
      null
    );

    const request = createRequest({
      token: "invalid-token",
      password: "newpassword123",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid");
  });

  it("returns 400 if token has expired", async () => {
    const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      token: "expired-token",
      expires: expiredDate,
    });
    (mockPrisma.passwordResetToken.delete as jest.Mock).mockResolvedValue({});

    const request = createRequest({
      token: "expired-token",
      password: "newpassword123",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("expired");
    expect(mockPrisma.passwordResetToken.delete).toHaveBeenCalled();
  });

  it("returns 400 if user not found", async () => {
    const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-1",
      email: "deleted@example.com",
      token: "valid-token",
      expires: futureDate,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest({
      token: "valid-token",
      password: "newpassword123",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("not found");
  });

  it("resets password successfully", async () => {
    const futureDate = new Date(Date.now() + 3600000);
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      token: "valid-token",
      expires: futureDate,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    (mockPrisma.passwordResetToken.delete as jest.Mock).mockResolvedValue({});

    const request = createRequest({
      token: "valid-token",
      password: "newpassword123",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("hashes the new password", async () => {
    const futureDate = new Date(Date.now() + 3600000);
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      token: "valid-token",
      expires: futureDate,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.passwordResetToken.delete as jest.Mock).mockResolvedValue({});

    const request = createRequest({
      token: "valid-token",
      password: "newpassword123",
    });
    await POST(request);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "new_hashed_password" },
    });
  });

  it("deletes the token after successful reset", async () => {
    const futureDate = new Date(Date.now() + 3600000);
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      token: "valid-token",
      expires: futureDate,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.passwordResetToken.delete as jest.Mock).mockResolvedValue({});

    const request = createRequest({
      token: "valid-token",
      password: "newpassword123",
    });
    await POST(request);

    expect(mockPrisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: "token-1" },
    });
  });
});
