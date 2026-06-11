import type { NetWorthPoint } from "./networth";
import type { Transaction } from "./types";

/**
 * Phase 3 insight calculations. All pure functions over snapshots-derived
 * series and transactions — no storage access.
 */

export interface MonthDelta {
  /** YYYY-MM of the later month. */
  month: string;
  /** Net worth change vs the previous month. */
  delta: number;
  /** Income minus expenses logged in that month, or null when nothing was logged. */
  saved: number | null;
  /** delta − saved: market movement / interest / untracked flows. Null when saved is null. */
  market: number | null;
}

/**
 * Decomposes the latest month-over-month net worth change into "money you
 * added" (from logged income/expenses) and "everything else" (market moves,
 * interest, untracked flows).
 */
export function latestMonthDelta(
  series: NetWorthPoint[],
  transactions: Transaction[],
): MonthDelta | null {
  if (series.length < 2) return null;
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const delta = current.netWorth - previous.netWorth;

  const monthTxns = transactions.filter((t) => t.date.startsWith(current.month));
  if (monthTxns.length === 0) {
    return { month: current.month, delta, saved: null, market: null };
  }
  const income = monthTxns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const saved = income - expenses;
  return { month: current.month, delta, saved, market: delta - saved };
}

/** Net worth milestone ladder in rupees: 1L → 10Cr. */
const MILESTONES = [
  100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 7_500_000,
  10_000_000, 25_000_000, 50_000_000, 100_000_000,
];

export interface Milestone {
  target: number;
  /** 0..1 progress from the previous milestone (or zero) toward the target. */
  progress: number;
  /** Average net worth growth per month over the recent past, or null if flat/unknown. */
  monthlyPace: number | null;
  /** Estimated YYYY-MM the target is reached at the current pace. */
  etaMonth: string | null;
}

/** Average month-over-month net worth change across up to the last 6 intervals. */
export function recentMonthlyPace(series: NetWorthPoint[]): number | null {
  if (series.length < 2) return null;
  const recent = series.slice(-7);
  const pace =
    (recent[recent.length - 1].netWorth - recent[0].netWorth) /
    (recent.length - 1);
  return pace > 0 ? pace : null;
}

/** Estimated YYYY-MM a target amount is reached at the given pace. */
export function etaMonthFor(
  remaining: number,
  monthlyPace: number | null,
): string | null {
  if (!monthlyPace || remaining <= 0) return null;
  const monthsLeft = Math.ceil(remaining / monthlyPace);
  const eta = new Date();
  eta.setMonth(eta.getMonth() + monthsLeft);
  return `${eta.getFullYear()}-${String(eta.getMonth() + 1).padStart(2, "0")}`;
}

export function nextMilestone(
  netWorth: number,
  series: NetWorthPoint[],
): Milestone | null {
  const target = MILESTONES.find((m) => m > netWorth);
  if (!target || netWorth <= 0) return null;
  const monthlyPace = recentMonthlyPace(series);
  return {
    target,
    progress: Math.max(0, Math.min(1, netWorth / target)),
    monthlyPace,
    etaMonth: etaMonthFor(target - netWorth, monthlyPace),
  };
}
