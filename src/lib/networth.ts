import type { Account, AccountType, Snapshot } from "./types";

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

const ALLOCATION_BUCKETS = [
  "Equity",
  "Retirement",
  "Fixed income",
  "Cash",
  "Gold",
  "Real estate",
  "Crypto",
  "Other",
] as const;

export type AllocationBucket = (typeof ALLOCATION_BUCKETS)[number];

const BUCKET_BY_TYPE: Partial<Record<AccountType, AllocationBucket>> = {
  mutual_fund: "Equity",
  stocks: "Equity",
  ppf: "Retirement",
  epf: "Retirement",
  nps: "Retirement",
  fd: "Fixed income",
  rd: "Fixed income",
  savings: "Cash",
  cash: "Cash",
  gold: "Gold",
  real_estate: "Real estate",
  crypto: "Crypto",
};

export const BUCKET_COLORS: Record<AllocationBucket, string> = {
  Equity: "#10b981",
  Retirement: "#8b5cf6",
  "Fixed income": "#f59e0b",
  Cash: "#0ea5e9",
  Gold: "#eab308",
  "Real estate": "#f97316",
  Crypto: "#ec4899",
  Other: "#64748b",
};

export interface AllocationSlice {
  bucket: AllocationBucket;
  value: number;
  color: string;
}

/** Groups asset accounts into broad allocation buckets for the donut chart. */
export function assetAllocation(accounts: Account[]): AllocationSlice[] {
  const totals = new Map<AllocationBucket, number>();
  for (const account of accounts) {
    if (account.kind !== "asset" || account.archivedAt) continue;
    const bucket = BUCKET_BY_TYPE[account.type] ?? "Other";
    totals.set(bucket, (totals.get(bucket) ?? 0) + account.currentValue);
  }
  return ALLOCATION_BUCKETS.filter((b) => (totals.get(b) ?? 0) > 0).map(
    (bucket) => ({
      bucket,
      value: totals.get(bucket)!,
      color: BUCKET_COLORS[bucket],
    }),
  );
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
