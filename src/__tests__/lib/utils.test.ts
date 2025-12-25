import { cn } from "@/lib/utils";

describe("cn (className utility)", () => {
  it("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("handles conditional classes with clsx", () => {
    const result = cn("base", true && "included", false && "excluded");
    expect(result).toBe("base included");
  });

  it("merges tailwind classes correctly", () => {
    // twMerge should handle conflicting classes
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("handles array inputs", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toBe("foo bar");
  });

  it("handles object inputs", () => {
    const result = cn({
      base: true,
      active: true,
      disabled: false,
    });
    expect(result).toBe("base active");
  });

  it("handles undefined and null", () => {
    const result = cn("foo", undefined, null, "bar");
    expect(result).toBe("foo bar");
  });

  it("handles empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles complex tailwind merging", () => {
    // Override text color
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles responsive classes", () => {
    const result = cn("w-full", "md:w-1/2");
    expect(result).toBe("w-full md:w-1/2");
  });

  it("handles hover and focus states", () => {
    const result = cn("bg-blue-500", "hover:bg-blue-600", "focus:bg-blue-700");
    expect(result).toBe("bg-blue-500 hover:bg-blue-600 focus:bg-blue-700");
  });
});
