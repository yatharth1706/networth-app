"use client";

import type { AccountRules, AccountType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/** Account types where auto-growth rules are offered by default. */
export const RULE_TYPES: AccountType[] = ["ppf", "epf", "nps", "fd", "rd"];

const SUGGESTED_RATE: Partial<Record<AccountType, string>> = {
  ppf: "7.1",
  epf: "8.25",
  nps: "10",
  fd: "7",
  rd: "7",
};

export interface RulesDraft {
  rate: string;
  contribution: string;
  every: string;
}

export function draftFromRules(rules?: AccountRules): RulesDraft {
  return {
    rate: rules?.annualRatePct ? String(rules.annualRatePct) : "",
    contribution: rules?.contributionAmount ? String(rules.contributionAmount) : "",
    every: String(rules?.contributionEveryMonths ?? 1),
  };
}

export function rulesFromDraft(draft: RulesDraft): AccountRules | undefined {
  const rate = Number(draft.rate);
  const contribution = Number(draft.contribution);
  const hasRate = Number.isFinite(rate) && rate > 0;
  const hasContribution = Number.isFinite(contribution) && contribution > 0;
  if (!hasRate && !hasContribution) return undefined;
  return {
    annualRatePct: hasRate ? rate : 0,
    ...(hasContribution
      ? {
          contributionAmount: contribution,
          contributionEveryMonths: Number(draft.every) as 1 | 3 | 12,
        }
      : {}),
  };
}

export function RulesFields({
  type,
  draft,
  onChange,
  idPrefix,
}: {
  type: AccountType;
  draft: RulesDraft;
  onChange: (draft: RulesDraft) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="grid gap-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Auto-growth (optional) — value is projected forward between monthly closes
      </legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-rate`}>Interest rate (% p.a.)</Label>
          <Input
            id={`${idPrefix}-rate`}
            type="number"
            min="0"
            step="any"
            placeholder={SUGGESTED_RATE[type] ?? "7"}
            value={draft.rate}
            onChange={(e) => onChange({ ...draft, rate: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-contribution`}>Deposit (₹)</Label>
          <Input
            id={`${idPrefix}-contribution`}
            type="number"
            min="0"
            step="any"
            placeholder="e.g. 5000"
            value={draft.contribution}
            onChange={(e) => onChange({ ...draft, contribution: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-every`}>Deposit frequency</Label>
          <Select
            id={`${idPrefix}-every`}
            value={draft.every}
            onChange={(e) => onChange({ ...draft, every: e.target.value })}
          >
            <option value="1">Monthly</option>
            <option value="3">Quarterly</option>
            <option value="12">Yearly</option>
          </Select>
        </div>
      </div>
    </fieldset>
  );
}
