"use client";

import { useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { formatCurrency } from "@/lib/config";
import { etaMonthFor, recentMonthlyPace } from "@/lib/insights";
import type { NetWorthPoint } from "@/lib/networth";
import type { Goal } from "@/lib/types";
import { uid } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export function GoalsCard({
  goals,
  netWorth,
  series,
  onChanged,
}: {
  goals: Goal[];
  netWorth: number;
  series: NetWorthPoint[];
  onChanged: () => void;
}) {
  const pace = recentMonthlyPace(series);

  async function handleDelete(id: string) {
    await getStorage().deleteGoal(id);
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="grid gap-1.5">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Goals
          </CardTitle>
          <CardDescription>
            Custom targets tracked against your net worth.
          </CardDescription>
        </div>
        <AddGoalDialog onAdded={onChanged} />
      </CardHeader>
      {goals.length > 0 && (
        <CardContent className="grid gap-5">
          {goals.map((goal) => {
            const progress = Math.max(0, Math.min(1, netWorth / goal.targetAmount));
            const remaining = goal.targetAmount - netWorth;
            const eta = etaMonthFor(remaining, pace);
            const targetMonth = goal.targetDate?.slice(0, 7) ?? null;
            const verdict =
              remaining <= 0
                ? "reached"
                : targetMonth && eta
                  ? eta <= targetMonth
                    ? "on track"
                    : "behind"
                  : null;
            return (
              <div key={goal.id} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {goal.name}
                    {verdict && (
                      <span
                        className={
                          verdict === "behind"
                            ? "ml-2 text-xs font-semibold text-negative"
                            : "ml-2 text-xs font-semibold text-positive"
                        }
                      >
                        {verdict}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground" data-amount>
                      {formatCurrency(Math.min(netWorth, goal.targetAmount))} /{" "}
                      {formatCurrency(goal.targetAmount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete goal"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(progress * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground" data-amount>
                  {(progress * 100).toFixed(0)}%
                  {remaining > 0 && <> · {formatCurrency(remaining)} to go</>}
                  {remaining > 0 && eta && <> · ~{formatMonth(eta)} at current pace</>}
                  {goal.targetDate && <> · deadline {goal.targetDate}</>}
                </p>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

function AddGoalDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(amount);
    if (!name.trim() || !Number.isFinite(target) || target <= 0) return;
    setBusy(true);
    try {
      await getStorage().saveGoal({
        id: uid(),
        name: name.trim(),
        targetAmount: target,
        targetDate: date || undefined,
        createdAt: new Date().toISOString(),
      });
      setName("");
      setAmount("");
      setDate("");
      setOpen(false);
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Add goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>New goal</DialogTitle>
        <DialogDescription>
          e.g. &ldquo;House down payment&rdquo; — ₹15,00,000 by Dec 2028.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              placeholder="House down payment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goal-amount">Target amount (₹)</Label>
            <Input
              id="goal-amount"
              type="number"
              min="0"
              step="any"
              placeholder="1500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goal-date">Deadline (optional)</Label>
            <Input
              id="goal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="justify-self-start">
            {busy ? "Adding…" : "Add goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
