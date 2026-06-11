"use client";

import { useState } from "react";
import { getStorage } from "@/lib/storage";
import { ACCOUNT_TYPE_META, type AccountType } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  RULE_TYPES,
  RulesFields,
  draftFromRules,
  rulesFromDraft,
  type RulesDraft,
} from "@/components/rules-fields";

const assetTypes = Object.entries(ACCOUNT_TYPE_META).filter(
  ([, meta]) => meta.kind === "asset",
);
const liabilityTypes = Object.entries(ACCOUNT_TYPE_META).filter(
  ([, meta]) => meta.kind === "liability",
);

export function AddAccountForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("savings");
  const [value, setValue] = useState("");
  const [rules, setRules] = useState<RulesDraft>(draftFromRules());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(value);
    if (!name.trim() || !Number.isFinite(amount) || amount < 0) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const account = {
        id: uid(),
        name: name.trim(),
        type,
        kind: ACCOUNT_TYPE_META[type].kind,
        currentValue: amount,
        rules: RULE_TYPES.includes(type) ? rulesFromDraft(rules) : undefined,
        createdAt: now,
        updatedAt: now,
      };
      const storage = getStorage();
      await storage.saveAccount(account);
      // First snapshot so the account shows up in history from day one.
      await storage.saveSnapshots([
        { id: uid(), accountId: account.id, date: todayISO(), value: amount },
      ]);
      setName("");
      setValue("");
      setRules(draftFromRules());
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="account-name">Name</Label>
        <Input
          id="account-name"
          placeholder="e.g. HDFC Savings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="account-type">Type</Label>
        <Select
          id="account-type"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
        >
          <optgroup label="Assets">
            {assetTypes.map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Liabilities">
            {liabilityTypes.map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </optgroup>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="account-value">Current value (₹)</Label>
        <Input
          id="account-value"
          type="number"
          min="0"
          step="any"
          placeholder="50000"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Adding…" : "Add account"}
      </Button>
      </div>

      {RULE_TYPES.includes(type) && (
        <RulesFields
          type={type}
          draft={rules}
          onChange={setRules}
          idPrefix="add"
        />
      )}
    </form>
  );
}
