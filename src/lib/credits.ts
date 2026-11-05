import type { Prisma, TransactionType } from "@prisma/client";

/** Thrown inside a transaction when the conditional debit didn't go through, so it rolls back. */
export class InsufficientCreditsError extends Error {
  constructor(message = "Not enough credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Conditional debit: `UPDATE users SET credits = credits - amount WHERE id = ? AND credits >= amount`.
 * Two concurrent requests can't both spend the last credits, and the balance never goes negative.
 * Records the matching CreditTransaction (negative amount) when the debit succeeds.
 *
 * Returns false when the balance wasn't enough (nothing is written).
 * Spending 0 is a no-op that returns true.
 */
export async function spendCredits(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: TransactionType,
  extra?: { readingId?: string; stripeSessionId?: string }
): Promise<boolean> {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError(`Invalid credit amount: ${amount}`);
  }
  if (amount === 0) return true;

  const { count } = await tx.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });

  if (count === 0) return false;

  await tx.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      type,
      ...(extra?.readingId ? { readingId: extra.readingId } : {}),
      ...(extra?.stripeSessionId ? { stripeSessionId: extra.stripeSessionId } : {}),
    },
  });

  return true;
}
