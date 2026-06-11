"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Flag,
  Landmark,
  LineChart,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getStorage } from "@/lib/storage";
import { effectiveValue, isProjected } from "@/lib/accrual";
import {
  assetAllocation,
  computeNetWorth,
  netWorthSeries,
} from "@/lib/networth";
import { formatCurrency } from "@/lib/config";
import {
  ACCOUNT_TYPE_META,
  ALLOCATION_TARGETS_KEY,
  type Account,
  type AllocationTargets,
  type Goal,
  type Snapshot,
  type Transaction,
} from "@/lib/types";
import { refreshAllNavs } from "@/lib/prices";
import { latestMonthDelta, nextMilestone } from "@/lib/insights";
import { CountUp } from "@/components/count-up";
import { AddAccountForm } from "@/components/add-account-form";
import { NetWorthChart } from "@/components/networth-chart";
import { AllocationDonut } from "@/components/allocation-donut";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { HoldingsDialog } from "@/components/holdings-dialog";
import { TargetsDialog } from "@/components/targets-dialog";
import { GoalsCard } from "@/components/goals-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [targets, setTargets] = useState<AllocationTargets>({});
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const reload = useCallback(() => {
    const storage = getStorage();
    void storage.getAccounts().then(setAccounts);
    void storage.getSnapshots().then(setSnapshots);
    void storage.getTransactions().then(setTransactions);
    void storage.getGoals().then(setGoals);
    void storage
      .getSetting<AllocationTargets>(ALLOCATION_TARGETS_KEY)
      .then((t) => setTargets(t ?? {}));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (accounts === null) {
    return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  }

  const { assets, liabilities, netWorth } = computeNetWorth(accounts);
  const series = netWorthSeries(accounts, snapshots);
  const allocation = assetAllocation(accounts);
  const hasMarketAccounts = accounts.some(
    (a) => a.type === "mutual_fund" || a.type === "stocks",
  );
  const monthDelta = latestMonthDelta(series, transactions);
  const milestone = nextMilestone(netWorth, series);

  async function handleRefreshNavs() {
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const result = await refreshAllNavs(getStorage());
      setRefreshNote(
        result.updated === 0 && result.failed === 0
          ? "No fund holdings with scheme codes yet — add some via the briefcase icon."
          : `Updated ${result.updated} NAV${result.updated === 1 ? "" : "s"}` +
              (result.failed > 0 ? `, ${result.failed} failed` : "") +
              ".",
      );
      reload();
    } catch {
      setRefreshNote("NAV refresh failed — check your internet connection.");
    } finally {
      setRefreshing(false);
    }
  }
  const assetAccounts = accounts.filter((a) => a.kind === "asset");
  const liabilityAccounts = accounts.filter((a) => a.kind === "liability");

  return (
    <div className="grid gap-6">
      <Card className="bg-gradient-to-br from-card to-muted">
        <CardHeader>
          <CardDescription>Net worth</CardDescription>
          <CardTitle>
            <CountUp
              value={netWorth}
              className="text-4xl font-bold tracking-tight sm:text-5xl"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {monthDelta && (
            <p data-amount>
              <span
                className={
                  monthDelta.delta >= 0
                    ? "font-semibold text-positive"
                    : "font-semibold text-negative"
                }
              >
                {signed(monthDelta.delta)}
              </span>{" "}
              this month
              {monthDelta.saved != null && monthDelta.market != null && (
                <span className="text-muted-foreground">
                  {" "}
                  · {signed(monthDelta.saved)} saved · {signed(monthDelta.market)}{" "}
                  market &amp; interest
                </span>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-positive" />
              Assets{" "}
              <span className="font-medium" data-amount>
                {formatCurrency(assets)}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-negative" />
              Liabilities{" "}
              <span className="font-medium" data-amount>
                {formatCurrency(liabilities)}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {series.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Net worth over time</CardTitle>
          </CardHeader>
          <CardContent>
            <NetWorthChart data={series} />
          </CardContent>
        </Card>
      ) : (
        accounts.length > 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Your net worth chart appears after two{" "}
              <Link href="/close" className="font-medium text-primary underline-offset-2 hover:underline">
                monthly closes
              </Link>
              . Do your first one now — it takes a minute.
            </CardContent>
          </Card>
        )
      )}

      {milestone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" /> Next milestone:{" "}
              <span data-amount>{formatCurrency(milestone.target, true)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(milestone.progress * 100).toFixed(1)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground" data-amount>
              {(milestone.progress * 100).toFixed(0)}% there ·{" "}
              {formatCurrency(milestone.target - netWorth)} to go
              {milestone.etaMonth && milestone.monthlyPace && (
                <>
                  {" "}
                  · at your recent pace ({signed(Math.round(milestone.monthlyPace))}
                  /month) you&apos;ll reach it around{" "}
                  <span className="font-medium text-foreground">
                    {formatEtaMonth(milestone.etaMonth)}
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {allocation.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="grid gap-1.5">
              <CardTitle>Asset allocation</CardTitle>
              <CardDescription>How your assets are split across classes</CardDescription>
            </div>
            <TargetsDialog targets={targets} allocation={allocation} onChanged={reload} />
          </CardHeader>
          <CardContent>
            <AllocationDonut data={allocation} targets={targets} />
          </CardContent>
        </Card>
      )}

      {(accounts.length > 0 || goals.length > 0) && (
        <GoalsCard
          goals={goals}
          netWorth={netWorth}
          series={series}
          onChanged={reload}
        />
      )}

      {accounts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome 👋</CardTitle>
            <CardDescription>
              Three steps to your net worth — no signup, everything stays on
              this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <OnboardingStep
              icon={<PiggyBank className="h-5 w-5" />}
              step="1. Add accounts"
              text="Everything that holds value: savings, mutual funds, PPF, EPF, gold — and loans too."
            />
            <OnboardingStep
              icon={<CalendarCheck className="h-5 w-5" />}
              step="2. Close each month"
              text="Once a month, update each account's value. Takes about a minute."
            />
            <OnboardingStep
              icon={<LineChart className="h-5 w-5" />}
              step="3. Watch it grow"
              text="Charts for net worth, allocation, and where your salary goes."
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add account</CardTitle>
        </CardHeader>
        <CardContent>
          <AddAccountForm onAdded={reload} />
        </CardContent>
      </Card>

      {hasMarketAccounts && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefreshNavs} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Refreshing…" : "Refresh fund NAVs"}
          </Button>
          {refreshNote && (
            <span className="text-xs text-muted-foreground" role="status">
              {refreshNote}
            </span>
          )}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <AccountList
            title="Assets"
            icon={<TrendingUp className="h-4 w-4 text-positive" />}
            accounts={assetAccounts}
            onChanged={reload}
          />
          <AccountList
            title="Liabilities"
            icon={<TrendingDown className="h-4 w-4 text-negative" />}
            accounts={liabilityAccounts}
            onChanged={reload}
          />
        </div>
      )}
    </div>
  );
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
}

function formatEtaMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function OnboardingStep({
  icon,
  step,
  text,
}: {
  icon: React.ReactNode;
  step: string;
  text: string;
}) {
  return (
    <div className="grid content-start gap-2 rounded-lg border border-border p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary">
        {icon}
      </span>
      <span className="text-sm font-medium">{step}</span>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

function AccountList({
  title,
  icon,
  accounts,
  onChanged,
}: {
  title: string;
  icon: React.ReactNode;
  accounts: Account[];
  onChanged: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between py-2.5"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {account.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_META[account.type].label}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="text-sm font-medium"
                    data-amount
                    title={
                      isProjected(account)
                        ? "Projected from this account's auto-growth rules"
                        : undefined
                    }
                  >
                    {isProjected(account) && (
                      <span className="text-muted-foreground">≈ </span>
                    )}
                    {formatCurrency(effectiveValue(account))}
                  </span>
                  {(account.type === "mutual_fund" || account.type === "stocks") && (
                    <HoldingsDialog account={account} onChanged={onChanged} />
                  )}
                  <EditAccountDialog account={account} onChanged={onChanged} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
