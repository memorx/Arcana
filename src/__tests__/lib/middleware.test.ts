/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { middleware, config } from "@/middleware";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

const mockGetToken = getToken as jest.Mock;

const run = (path: string) => middleware(new NextRequest(new URL(path, "https://www.readarcana.com")));

/** Same semantics Next uses for `:path*` (zero or more segments). */
const matched = (path: string) =>
  config.matcher.some((pattern) => {
    const base = pattern.replace(/\/:path\*$/, "");
    return pattern.endsWith("/:path*") ? path === base || path.startsWith(`${base}/`) : path === pattern;
  });

describe("middleware: private pages of this round (F-81)", () => {
  beforeEach(() => mockGetToken.mockReset());

  it.each(["/blueprint", "/compatibility", "/compatibility/abc123", "/history/insights", "/reading/manual"])(
    "%s sends a guest to login with a callbackUrl",
    async (path) => {
      mockGetToken.mockResolvedValue(null);
      expect(matched(path)).toBe(true);

      const res = await run(path);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("callbackUrl")).toBe(path);
    }
  );

  it.each(["/blueprint", "/compatibility/abc123"])("%s lets a signed-in user through", async (path) => {
    mockGetToken.mockResolvedValue({ sub: "u1" });
    const res = await run(path);
    expect(res.headers.get("location")).toBeNull();
  });

  it.each(["/calendar", "/share/blueprint/abcdefghij"])("%s stays public (not matched, never redirected)", async (path) => {
    mockGetToken.mockResolvedValue(null);
    expect(matched(path)).toBe(false);
    const res = await run(path);
    expect(res.headers.get("location")).toBeNull();
  });
});
