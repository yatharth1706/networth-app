"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { computeNetWorth } from "@/lib/networth";
import { formatCurrency } from "@/lib/config";
import { ACCOUNT_TYPE_META, type Account } from "@/lib/types";
import { CountUp } from "@/components/count-up";
import { AddAccountForm } from "@/components/add-account-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);

  const reload = useCallback(() => {
    void getStorage().getAccounts().then(setAccounts);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (accounts === null) {
    return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  }

  const { assets, liabilities, netWorth } = computeNetWorth(accounts);
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

      {accounts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" /> Welcome! Add your first account
            </CardTitle>
            <CardDescription>
              Add anything that holds value — bank accounts, mutual funds, PPF,
              gold, or loans. Everything stays on this device.
            </CardDescription>
          </CardHeader>
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
          />
          <AccountList
            title="Liabilities"
            icon={<TrendingDown className="h-4 w-4 text-negative" />}
            accounts={liabilityAccounts}
          />
        </div>
      )}
    </div>
  );
}

function AccountList({
  title,
  icon,
  accounts,
}: {
  title: string;
  icon: React.ReactNode;
  accounts: Account[];
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
                <span className="text-sm font-medium" data-amount>
                  {formatCurrency(account.currentValue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
