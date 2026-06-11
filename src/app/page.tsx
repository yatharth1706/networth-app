"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Landmark,
  LineChart,
  PiggyBank,
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
import { ACCOUNT_TYPE_META, type Account, type Snapshot } from "@/lib/types";
import { CountUp } from "@/components/count-up";
import { AddAccountForm } from "@/components/add-account-form";
import { NetWorthChart } from "@/components/networth-chart";
import { AllocationDonut } from "@/components/allocation-donut";
import { EditAccountDialog } from "@/components/edit-account-dialog";
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

  const reload = useCallback(() => {
    const storage = getStorage();
    void storage.getAccounts().then(setAccounts);
    void storage.getSnapshots().then(setSnapshots);
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
        <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
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

      {allocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asset allocation</CardTitle>
            <CardDescription>How your assets are split across classes</CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationDonut data={allocation} />
          </CardContent>
        </Card>
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
