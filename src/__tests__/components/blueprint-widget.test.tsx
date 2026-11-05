import { render, screen } from "@testing-library/react";
import { BlueprintWidget } from "@/components/dashboard/BlueprintWidget";
import { blueprintInputsHash } from "@/lib/ai/blueprint-synthesis";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: jest.fn() },
    arcanaProfile: { findUnique: jest.fn() },
  },
}));

// The widget only needs the hash; keep the Anthropic SDK (needs TextEncoder) out of jsdom.
jest.mock("@/lib/ai/config", () => ({ AI_MODELS: { synthesis: "test-model" }, complete: jest.fn() }));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${namespace}.${key}:${Object.values(values).join(",")}` : `${namespace}.${key}`
  ),
  getLocale: jest.fn(async () => "es"),
}));

import { prisma } from "@/lib/prisma";

const userProfile = prisma.userProfile as unknown as { findUnique: jest.Mock };
const arcanaProfile = prisma.arcanaProfile as unknown as { findUnique: jest.Mock };
const birthDate = new Date("1990-07-15T00:00:00.000Z");

describe("BlueprintWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders nothing (instead of breaking the dashboard) when the database fails", async () => {
    userProfile.findUnique.mockRejectedValue(new Error("db down"));
    arcanaProfile.findUnique.mockResolvedValue(null);
    await expect(BlueprintWidget({ userId: "user-1" })).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("without a profile it links to the setup", async () => {
    userProfile.findUnique.mockResolvedValue(null);
    arcanaProfile.findUnique.mockResolvedValue(null);
    render((await BlueprintWidget({ userId: "user-1" }))!);
    expect(screen.getByRole("link", { name: "blueprint.widget.setupCta" })).toHaveAttribute("href", "/profile/setup");
  });

  it("with a profile it shows the badges, the synthesis status and the link to /blueprint", async () => {
    userProfile.findUnique.mockResolvedValue({ birthDate, fullName: "Ana López", locale: "es" });
    arcanaProfile.findUnique.mockResolvedValue({ inputsHash: blueprintInputsHash(birthDate, "Ana López", "es") });
    render((await BlueprintWidget({ userId: "user-1" }))!);
    expect(screen.getByRole("list", { name: "blueprint.badgesLabel" })).toBeInTheDocument();
    expect(screen.getByText("Caballo de Metal")).toBeInTheDocument();
    expect(screen.getByText("blueprint.widget.synthesisReady")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "blueprint.widget.cta" })).toHaveAttribute("href", "/blueprint");
  });
});
