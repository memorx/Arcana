import { CREDIT_PACKAGES, getPackageById, CreditPackage } from "@/lib/pricing";

describe("CREDIT_PACKAGES", () => {
  it("contains three packages", () => {
    expect(CREDIT_PACKAGES).toHaveLength(3);
  });

  it("has correct structure for each package", () => {
    CREDIT_PACKAGES.forEach((pkg) => {
      expect(pkg).toHaveProperty("id");
      expect(pkg).toHaveProperty("credits");
      expect(pkg).toHaveProperty("price");
      expect(pkg).toHaveProperty("priceDisplay");
      expect(pkg).toHaveProperty("popular");
      expect(pkg).toHaveProperty("description");
    });
  });

  it("has one popular package", () => {
    const popularPackages = CREDIT_PACKAGES.filter((pkg) => pkg.popular);
    expect(popularPackages).toHaveLength(1);
  });

  it("has 5 credit package at $1.99", () => {
    const pkg = CREDIT_PACKAGES.find((p) => p.credits === 5);
    expect(pkg).toBeDefined();
    expect(pkg?.price).toBe(199);
    expect(pkg?.priceDisplay).toBe("$1.99");
  });

  it("has 15 credit package at $4.99 (popular)", () => {
    const pkg = CREDIT_PACKAGES.find((p) => p.credits === 15);
    expect(pkg).toBeDefined();
    expect(pkg?.price).toBe(499);
    expect(pkg?.priceDisplay).toBe("$4.99");
    expect(pkg?.popular).toBe(true);
  });

  it("has 30 credit package at $8.99", () => {
    const pkg = CREDIT_PACKAGES.find((p) => p.credits === 30);
    expect(pkg).toBeDefined();
    expect(pkg?.price).toBe(899);
    expect(pkg?.priceDisplay).toBe("$8.99");
  });

  it("prices increase with credits", () => {
    const sortedByCredits = [...CREDIT_PACKAGES].sort(
      (a, b) => a.credits - b.credits
    );
    for (let i = 1; i < sortedByCredits.length; i++) {
      expect(sortedByCredits[i].price).toBeGreaterThan(
        sortedByCredits[i - 1].price
      );
    }
  });

  it("offers better value with larger packages", () => {
    // Price per credit should decrease with larger packages
    const pricesPerCredit = CREDIT_PACKAGES.map((pkg) => ({
      credits: pkg.credits,
      pricePerCredit: pkg.price / pkg.credits,
    }));

    const sortedByCredits = pricesPerCredit.sort(
      (a, b) => a.credits - b.credits
    );
    for (let i = 1; i < sortedByCredits.length; i++) {
      expect(sortedByCredits[i].pricePerCredit).toBeLessThan(
        sortedByCredits[i - 1].pricePerCredit
      );
    }
  });
});

describe("getPackageById", () => {
  it("returns correct package for valid id", () => {
    const pkg = getPackageById("pack_5");
    expect(pkg).toBeDefined();
    expect(pkg?.credits).toBe(5);
  });

  it("returns pack_15 correctly", () => {
    const pkg = getPackageById("pack_15");
    expect(pkg).toBeDefined();
    expect(pkg?.credits).toBe(15);
    expect(pkg?.popular).toBe(true);
  });

  it("returns pack_30 correctly", () => {
    const pkg = getPackageById("pack_30");
    expect(pkg).toBeDefined();
    expect(pkg?.credits).toBe(30);
  });

  it("returns undefined for invalid id", () => {
    const pkg = getPackageById("invalid_id");
    expect(pkg).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    const pkg = getPackageById("");
    expect(pkg).toBeUndefined();
  });

  it("is case sensitive", () => {
    const pkg = getPackageById("PACK_5");
    expect(pkg).toBeUndefined();
  });
});

describe("CreditPackage type", () => {
  it("can create a valid package object", () => {
    const pkg: CreditPackage = {
      id: "test_pack",
      credits: 10,
      price: 299,
      priceDisplay: "$2.99",
      popular: false,
      description: "Test package",
    };

    expect(pkg.id).toBe("test_pack");
    expect(pkg.credits).toBe(10);
    expect(pkg.price).toBe(299);
    expect(pkg.priceDisplay).toBe("$2.99");
    expect(pkg.popular).toBe(false);
    expect(pkg.description).toBe("Test package");
  });
});
