"use client";

import { useState } from "react";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { getStorage } from "@/lib/storage";
import {
  ACCOUNT_TYPE_META,
  type Account,
  type AccountType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function EditAccountDialog({
  account,
  onChanged,
}: {
  account: Account;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [value, setValue] = useState(String(account.currentValue));
  const [rules, setRules] = useState<RulesDraft>(draftFromRules(account.rules));
  const [busy, setBusy] = useState(false);

  function reset() {
    setName(account.name);
    setType(account.type);
    setValue(String(account.currentValue));
    setRules(draftFromRules(account.rules));
  }

  const showRules =
    ACCOUNT_TYPE_META[type].kind === "asset" &&
    (RULE_TYPES.includes(type) || account.rules != null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(value);
    if (!name.trim() || !Number.isFinite(amount) || amount < 0) return;
    setBusy(true);
    try {
      await getStorage().saveAccount({
        ...account,
        name: name.trim(),
        type,
        kind: ACCOUNT_TYPE_META[type].kind,
        currentValue: amount,
        rules: showRules ? rulesFromDraft(rules) : undefined,
        updatedAt: new Date().toISOString(),
      });
      setOpen(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    try {
      await getStorage().archiveAccount(account.id);
      setOpen(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `Delete "${account.name}" along with its entire snapshot history? ` +
        "This cannot be undone. Use Archive to hide it but keep history.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      await getStorage().deleteAccount(account.id);
      setOpen(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit account">
          <Pencil className="text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit account</DialogTitle>
        <DialogDescription>
          Changing the value here updates the current value only — monthly
          history comes from snapshots.
        </DialogDescription>
        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-type">Type</Label>
            <Select
              id="edit-type"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
            >
              <optgroup label="Assets">
                {assetTypes.map(([v, meta]) => (
                  <option key={v} value={v}>
                    {meta.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Liabilities">
                {liabilityTypes.map(([v, meta]) => (
                  <option key={v} value={v}>
                    {meta.label}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-value">Current value (₹)</Label>
            <Input
              id="edit-value"
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
          {showRules && (
            <RulesFields
              type={type}
              draft={rules}
              onChange={setRules}
              idPrefix="edit"
            />
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleArchive}
              title="Hide from lists but keep snapshot history"
            >
              <Archive /> Archive
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={handleDelete}
              className="ml-auto text-negative hover:text-negative"
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
