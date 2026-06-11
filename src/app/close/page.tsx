"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { effectiveValue, isProjected } from "@/lib/accrual";
import { formatCurrency } from "@/lib/config";
import { ACCOUNT_TYPE_META, type Account } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MonthlyClose() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayISO());
  const [lastClose, setLastClose] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const storage = getStorage();
    void storage.getAccounts().then((list) => {
      setAccounts(list);
      // Rule-based accounts prefill with their projected value so the close
      // is one click unless reality differs.
      setValues(
        Object.fromEntries(list.map((a) => [a.id, String(effectiveValue(a))])),
      );
    });
    void storage.getSnapshots().then((snaps) => {
      setLastClose(snaps.at(-1)?.date ?? null);
    });
  }, []);

  if (accounts === null) {
    return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nothing to close yet</CardTitle>
          <CardDescription>
            Add accounts on the{" "}
            <Link href="/" className="font-medium text-primary underline-offset-2 hover:underline">
              dashboard
            </Link>{" "}
            first, then come back to record their values each month.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-positive" /> Books closed for{" "}
            {date}
          </CardTitle>
          <CardDescription>
            All {accounts.length} accounts snapshotted. See you next month!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const storage = getStorage();
      const now = new Date().toISOString();
      const snapshots = accounts!.map((account) => ({
        id: uid(),
        accountId: account.id,
        date,
        value: Number(values[account.id]) || 0,
      }));
      await storage.saveSnapshots(snapshots);
      for (const account of accounts!) {
        const value = Number(values[account.id]) || 0;
        if (value !== account.currentValue) {
          await storage.saveAccount({
            ...account,
            currentValue: value,
            updatedAt: now,
          });
        }
      }
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> Monthly close
          </CardTitle>
          <CardDescription>
            Update each account to its current value, then save. One snapshot
            per account per date — re-running a close for the same date simply
            overwrites it.
            {lastClose && <> Last close: {lastClose}.</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid max-w-48 gap-1.5">
            <Label htmlFor="close-date">Snapshot date</Label>
            <Input
              id="close-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <ul className="divide-y divide-border">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="grid items-center gap-2 py-3 sm:grid-cols-[1fr_auto_12rem]"
              >
                <span>
                  <span className="block text-sm font-medium">
                    {account.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_META[account.type].label}
                    {account.kind === "liability" && " (outstanding)"}
                    {isProjected(account) && " · prefilled from auto-growth rules"}
                  </span>
                </span>
                <span
                  className="text-xs text-muted-foreground sm:text-right"
                  data-amount
                >
                  was {formatCurrency(account.currentValue)}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={values[account.id] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [account.id]: e.target.value }))
                  }
                  data-amount
                />
              </li>
            ))}
          </ul>

          <Button onClick={handleSave} disabled={saving} className="justify-self-start">
            {saving ? "Saving…" : `Save snapshot (${accounts.length} accounts)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
