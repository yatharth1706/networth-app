import type { Account, Snapshot } from "./types";

export interface NetWorthSummary {
  assets: number;
  liabilities: number;
  netWorth: number;
}

export function computeNetWorth(accounts: Account[]): NetWorthSummary {
  let assets = 0;
  let liabilities = 0;
  for (const account of accounts) {
    if (account.archivedAt) continue;
    if (account.kind === "asset") assets += account.currentValue;
    else liabilities += account.currentValue;
  }
  return { assets, liabilities, netWorth: assets - liabilities };
}

export interface NetWorthPoint {
  /** YYYY-MM */
  month: string;
  netWorth: number;
}

/**
 * Builds the net-worth-over-time series from snapshots. For each month, every
 * account contributes its most recent snapshot up to that month, so a missed
 * monthly close for one account doesn't crater the chart.
 */
export function netWorthSeries(
  accounts: Account[],
  snapshots: Snapshot[],
): NetWorthPoint[] {
  if (snapshots.length === 0) return [];

  const kindById = new Map(accounts.map((a) => [a.id, a.kind]));
  const months = [...new Set(snapshots.map((s) => s.date.slice(0, 7)))].sort();
  const byAccount = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    if (!byAccount.has(s.accountId)) byAccount.set(s.accountId, []);
    byAccount.get(s.accountId)!.push(s);
  }
  for (const list of byAccount.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  return months.map((month) => {
    let netWorth = 0;
    for (const [accountId, list] of byAccount) {
      const latest = list.filter((s) => s.date.slice(0, 7) <= month).at(-1);
      if (!latest) continue;
      const kind = kindById.get(accountId);
      netWorth += kind === "liability" ? -latest.value : latest.value;
    }
    return { month, netWorth };
  });
}
