/**
 * @jest-environment node
 *
 * N-1: the server render must not depend on the clock, so hydration can't
 * disagree with the browser near the 24 h mark.
 */
// @ts-expect-error -- @types/react-dom isn't a dependency (and lots don't install packages); runtime is fine.
import { renderToString } from "react-dom/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

import { ResonanceCheck } from "@/components/reading/ResonanceCheck";

const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

describe("ResonanceCheck on the server (N-1)", () => {
  it("renders nothing for an unrated reading until the browser reads the clock", () => {
    const html = renderToString(
      <ResonanceCheck readingId="r1" createdAt={twoDaysAgo} resonance={null} resonanceNote={null} locale="es" />
    );

    expect(html).toBe("");
  });

  it("renders a saved rating right away (it doesn't depend on the clock)", () => {
    const html = renderToString(
      <ResonanceCheck readingId="r1" createdAt={twoDaysAgo} resonance={4} resonanceNote="Sí pasó" locale="es" />
    );

    expect(html).toContain("result");
    expect(html).toContain("Sí pasó");
  });
});
