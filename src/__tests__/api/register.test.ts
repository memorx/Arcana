/**
 * @jest-environment node
 */
import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  it("returns 400 if email is missing", async () => {
    const request = createRequest({ password: "password123" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 if password is missing", async () => {
    const request = createRequest({ email: "test@example.com" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 if password is too short", async () => {
    const request = createRequest({
      email: "test@example.com",
      password: "12345",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("6");
  });

  it("returns 400 if email already exists", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "existing-user",
      email: "test@example.com",
    });

    const request = createRequest({
      email: "test@example.com",
      password: "password123",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("registrado");
  });

  it("creates user successfully", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: "new-user-id",
      email: "new@example.com",
      name: "Test User",
      freeReadingsLeft: 3,
      credits: 0,
    });

    const request = createRequest({
      email: "new@example.com",
      password: "password123",
      name: "Test User",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("new@example.com");
    expect(data.user.name).toBe("Test User");
  });

  it("creates user without name", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: "new-user-id",
      email: "new@example.com",
      name: null,
      freeReadingsLeft: 3,
      credits: 0,
    });

    const request = createRequest({
      email: "new@example.com",
      password: "password123",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.email).toBe("new@example.com");
  });

  it("hashes the password before storing", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: "new-user-id",
      email: "test@example.com",
      name: null,
    });

    const request = createRequest({
      email: "test@example.com",
      password: "password123",
    });
    await POST(request);

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: "hashed_password",
        }),
      })
    );
  });

  it("returns user without password in response", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: "new-user-id",
      email: "new@example.com",
      name: "Test",
      password: "hashed_password",
    });

    const request = createRequest({
      email: "new@example.com",
      password: "password123",
      name: "Test",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(data.user.password).toBeUndefined();
  });
});
