"use client";

import { ACCOUNT_TYPE_META, type AccountRules, type AccountType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/** Account types where auto-growth/amortization rules are offered by default. */
export const RULE_TYPES: AccountType[] = [
  "ppf",
  "epf",
  "nps",
  "fd",
  "rd",
  "home_loan",
  "car_loan",
  "personal_loan",
  "education_loan",
];

const SUGGESTED_RATE: Partial<Record<AccountType, string>> = {
  ppf: "7.1",
  epf: "8.25",
  nps: "10",
  fd: "7",
  rd: "7",
  home_loan: "8.5",
  car_loan: "9.5",
  personal_loan: "12",
  education_loan: "10",
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
  const isLiability = ACCOUNT_TYPE_META[type].kind === "liability";
  return (
    <fieldset className="grid gap-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        {isLiability
          ? "Amortization (optional) — outstanding balance is projected forward between monthly closes"
          : "Auto-growth (optional) — value is projected forward between monthly closes"}
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
          <Label htmlFor={`${idPrefix}-contribution`}>
            {isLiability ? "EMI (₹)" : "Deposit (₹)"}
          </Label>
          <Input
            id={`${idPrefix}-contribution`}
            type="number"
            min="0"
            step="any"
            placeholder={isLiability ? "e.g. 25000" : "e.g. 5000"}
            value={draft.contribution}
            onChange={(e) => onChange({ ...draft, contribution: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-every`}>
            {isLiability ? "Payment frequency" : "Deposit frequency"}
          </Label>
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
