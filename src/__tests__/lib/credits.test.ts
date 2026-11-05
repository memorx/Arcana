/**
 * @jest-environment node
 */
import type { Prisma } from "@prisma/client";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits";

const makeTx = (count: number) => {
  const tx = {
    user: { updateMany: jest.fn().mockResolvedValue({ count }) },
    creditTransaction: { create: jest.fn().mockResolvedValue({}) },
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient };
};

describe("spendCredits", () => {
  it("debits only when the balance covers the amount", async () => {
    const { tx, client } = makeTx(1);

    await spendCredits(client, "user-1", 3, "READING");

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", credits: { gte: 3 } },
      data: { credits: { decrement: 3 } },
    });
  });

  it("returns true and records a negative transaction when the debit goes through", async () => {
    const { tx, client } = makeTx(1);

    const ok = await spendCredits(client, "user-1", 2, "READING", { readingId: "reading-1" });

    expect(ok).toBe(true);
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: "user-1", amount: -2, type: "READING", readingId: "reading-1" },
    });
  });

  it("returns false and writes no transaction when the balance is not enough", async () => {
    const { tx, client } = makeTx(0);

    const ok = await spendCredits(client, "user-1", 10, "SUBSCRIPTION");

    expect(ok).toBe(false);
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("passes the Stripe session id through", async () => {
    const { tx, client } = makeTx(1);

    await spendCredits(client, "user-1", 1, "FOLLOWUP", { stripeSessionId: "cs_123" });

    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: "user-1", amount: -1, type: "FOLLOWUP", stripeSessionId: "cs_123" },
    });
  });

  it("treats spending 0 as a no-op", async () => {
    const { tx, client } = makeTx(0);

    await expect(spendCredits(client, "user-1", 0, "READING")).resolves.toBe(true);
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects negative or fractional amounts", async () => {
    const { client } = makeTx(1);

    await expect(spendCredits(client, "user-1", -1, "READING")).rejects.toThrow(RangeError);
    await expect(spendCredits(client, "user-1", 1.5, "READING")).rejects.toThrow(RangeError);
  });
});

describe("InsufficientCreditsError", () => {
  it("is an Error with its own name", () => {
    const error = new InsufficientCreditsError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("InsufficientCreditsError");
  });
});
