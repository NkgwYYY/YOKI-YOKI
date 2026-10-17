import type { VerifiedBonus } from './bonusLedger';
import type { CollectedBonus } from './dailyAds';

/** One collector per account session; never reuse a previous account's promise. */
export function createBonusCollector(deps: {
  current(): boolean;
  ready(): boolean;
  status(): Promise<{claims: VerifiedBonus[]; remaining: number; day: string}>;
  grant(claim: VerifiedBonus, current: () => boolean): Promise<number>;
  acknowledge(id: string): Promise<unknown>;
}) {
  let task: Promise<CollectedBonus> | null = null;
  const check = () => { if (!deps.current() || !deps.ready()) throw Error('データを準備しています。'); };
  return () => {
    check();
    if (task) return task;
    const run = (async () => {
      const status = await deps.status(); check();
      if (!Array.isArray(status.claims) || !Number.isInteger(status.remaining) || status.remaining < 0 || status.remaining > 3 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(status.day)) throw Error('追加報酬を確認できません。');
      let gained = 0;
      const confirmedIds: string[] = [];
      for (const claim of status.claims) {
        check(); gained += await deps.grant(claim, deps.current); check();
        confirmedIds.push(claim.id);
        await deps.acknowledge(claim.id); check();
      }
      return {gained, remaining: status.remaining, day: status.day, confirmedIds};
    })();
    task = run;
    void run.then(() => { if (task === run) task = null; }, () => { if (task === run) task = null; });
    return run;
  };
}
