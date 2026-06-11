import type { Account } from "./types";

/**
 * Projects an account's value forward from its last manual update using its
 * auto-growth rules: monthly compounding at the annual rate, plus scheduled
 * contributions. This is an approximation — Indian schemes differ in exact
 * crediting rules (PPF credits annually on the month-5 minimum, EPF credits
 * yearly, FDs compound quarterly) — but it tracks closely enough for a net
 * worth view, and every monthly close re-anchors it to reality.
 */
export function effectiveValue(account: Account, asOf: Date = new Date()): number {
  const rules = account.rules;
  if (!rules || (!rules.annualRatePct && !rules.contributionAmount)) {
    return account.currentValue;
  }

  const baseline = new Date(account.updatedAt);
  const monthsElapsed =
    (asOf.getFullYear() - baseline.getFullYear()) * 12 +
    (asOf.getMonth() - baseline.getMonth());
  if (monthsElapsed <= 0) return account.currentValue;

  const monthlyRate = (rules.annualRatePct ?? 0) / 100 / 12;
  const every = rules.contributionEveryMonths ?? 1;
  let value = account.currentValue;
  for (let month = 1; month <= monthsElapsed; month++) {
    value *= 1 + monthlyRate;
    if (rules.contributionAmount && month % every === 0) {
      value += rules.contributionAmount;
    }
  }
  return Math.round(value);
}

/** True when the displayed value is a projection rather than a manual entry. */
export function isProjected(account: Account, asOf: Date = new Date()): boolean {
  return account.rules != null && effectiveValue(account, asOf) !== account.currentValue;
}
