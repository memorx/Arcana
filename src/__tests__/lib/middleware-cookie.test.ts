/**
 * @jest-environment node
 *
 * Session cookie name by protocol (PLAN 2026-11-05 §5.1): `next start` on http
 * (local e2e) must read `authjs.session-token`; https (Vercel) keeps reading
 * `__Secure-authjs.session-token`, whatever NODE_ENV says.
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { middleware, sessionCookieName } from "@/middleware";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

const mockGetToken = getToken as jest.Mock;

const cookieNameUsedFor = async (url: string) => {
  mockGetToken.mockResolvedValue({ sub: "u1" });
  await middleware(new NextRequest(new URL(url)));
  expect(mockGetToken).toHaveBeenCalledTimes(1);
  return mockGetToken.mock.calls[0][0].cookieName as string;
};

describe("sessionCookieName", () => {
  it("uses the __Secure- name over https", () => {
    expect(sessionCookieName("https:")).toBe("__Secure-authjs.session-token");
  });

  it("uses the plain name over http", () => {
    expect(sessionCookieName("http:")).toBe("authjs.session-token");
  });
});

describe("middleware reads the cookie for the request's protocol", () => {
  const env = process.env as Record<string, string | undefined>;
  const savedNodeEnv = env.NODE_ENV;

  beforeEach(() => mockGetToken.mockReset());
  afterEach(() => {
    env.NODE_ENV = savedNodeEnv;
  });

  it("https (Vercel) → __Secure-authjs.session-token", async () => {
    env.NODE_ENV = "production";
    expect(await cookieNameUsedFor("https://www.readarcana.com/dashboard")).toBe("__Secure-authjs.session-token");
  });

  it("http under a production build (next start for e2e) → authjs.session-token", async () => {
    env.NODE_ENV = "production";
    expect(await cookieNameUsedFor("http://localhost:3000/dashboard")).toBe("authjs.session-token");
  });

  it("http in development → authjs.session-token", async () => {
    env.NODE_ENV = "development";
    expect(await cookieNameUsedFor("http://localhost:3000/history")).toBe("authjs.session-token");
  });

  it("a signed-in user on http is let through (no bounce to /login)", async () => {
    env.NODE_ENV = "production";
    mockGetToken.mockResolvedValue({ sub: "u1" });
    const res = await middleware(new NextRequest(new URL("http://localhost:3000/blueprint")));
    expect(res.headers.get("location")).toBeNull();
  });
});
