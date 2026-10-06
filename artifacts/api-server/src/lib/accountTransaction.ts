import { db, userData } from '@workspace/db';
import { and, eq } from 'drizzle-orm';
import type { Response } from 'express';

// Never synchronized to clients. Retain only a deletion fence, not user content,
// so requests authenticated before identity removal cannot recreate an account.
export const ACCOUNT_STATE_KEY = '@yoki/server/account-state-v1';
export const SERVER_KEY_PREFIX = '@yoki/server/';
export type AccountTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

class AccountDeletedError extends Error {}

export function withAccountTransaction<T>(
  userId: string,
  work: (tx: AccountTransaction) => Promise<T>,
  allowDeleted = false,
): Promise<T> {
  return db.transaction(async tx => {
    await tx.insert(userData).values({ userId, key: ACCOUNT_STATE_KEY, value: { deleted: false } })
      .onConflictDoNothing({ target: [userData.userId, userData.key] });
    // Every account read/write and deletion uses this same row lock. Unlike an
    // in-memory mutex, it orders requests across API processes as well.
    const [state] = await tx.select({ value: userData.value }).from(userData)
      .where(and(eq(userData.userId, userId), eq(userData.key, ACCOUNT_STATE_KEY))).for('update');
    if (!state || (state.value as { deleted?: unknown })?.deleted !== false) {
      if (!allowDeleted) throw new AccountDeletedError();
    }
    return work(tx);
  });
}

export function respondToDeletedAccount(error: unknown, res: Response): boolean {
  if (!(error instanceof AccountDeletedError)) return false;
  res.status(410).json({ code: 'ACCOUNT_DELETED', error: 'このアカウントのデータは削除されています' });
  return true;
}
