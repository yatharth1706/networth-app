"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { formatCurrency } from "@/lib/config";
import type { Category, Transaction } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  return monthKey(new Date(year, m - 1 + delta));
}

export default function Expenses() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const reload = useCallback(() => {
    void getStorage()
      .getTransactions({ from: `${month}-01`, to: `${month}-31` })
      .then(setTransactions);
  }, [month]);

  useEffect(() => {
    reload();
    void getStorage().getCategories().then(setCategories);
  }, [reload]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const txns = useMemo(() => transactions ?? [], [transactions]);
  const income = txns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = txns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of txns) {
      if (t.type !== "expense") continue;
      const key = t.categoryId ?? "uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + t.amount);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [txns]);

  async function handleDelete(id: string) {
    await getStorage().deleteTransaction(id);
    reload();
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Expenses</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">
            {monthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= monthKey(new Date())}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Income" value={income} tone="positive" />
        <SummaryCard label="Expenses" value={expenses} tone="negative" />
        <SummaryCard
          label="Saved"
          value={income - expenses}
          tone={income - expenses >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTransactionForm categories={categories} onAdded={reload} />
        </CardContent>
      </Card>

      {byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Where it went</CardTitle>
            <CardDescription>Expense breakdown for {monthLabel(month)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {byCategory.map(([categoryId, total]) => {
              const category = categoryById.get(categoryId);
              const pct = expenses > 0 ? (total / expenses) * 100 : 0;
              return (
                <div key={categoryId} className="grid gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {category?.name ?? "Uncategorized"}
                    </span>
                    <span className="text-muted-foreground" data-amount>
                      {formatCurrency(total)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: category?.color ?? "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : txns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions in {monthLabel(month)} yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {t.description || categoryById.get(t.categoryId ?? "")?.name || t.type}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t.date}
                      {t.categoryId && ` · ${categoryById.get(t.categoryId)?.name ?? ""}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        t.type === "income"
                          ? "text-sm font-medium text-positive"
                          : "text-sm font-medium"
                      }
                      data-amount
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t.id)}
                      title="Delete"
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={tone === "positive" ? "text-positive" : "text-negative"}
          data-amount
        >
          {formatCurrency(value)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function AddTransactionForm({
  categories,
  onAdded,
}: {
  categories: Category[];
  onAdded: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const options = categories.filter((c) => c.type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await getStorage().saveTransaction({
        id: uid(),
        date,
        amount: value,
        type,
        categoryId: categoryId || options[0]?.id,
        description: description.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
      setAmount("");
      setDescription("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 sm:grid-cols-[7rem_1fr_1fr_1fr_1fr_auto] sm:items-end"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="txn-type">Type</Label>
        <Select
          id="txn-type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as "expense" | "income");
            setCategoryId("");
          }}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="txn-amount">Amount (₹)</Label>
        <Input
          id="txn-amount"
          type="number"
          min="0"
          step="any"
          placeholder="500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="txn-category">Category</Label>
        <Select
          id="txn-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="txn-date">Date</Label>
        <Input
          id="txn-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="txn-desc">Note</Label>
        <Input
          id="txn-desc"
          placeholder="optional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
