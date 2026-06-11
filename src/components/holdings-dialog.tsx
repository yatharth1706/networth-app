"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus, Search, Trash2 } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { formatCurrency } from "@/lib/config";
import {
  fetchLatestNav,
  searchSchemes,
  syncAccountValues,
  type MfSearchResult,
} from "@/lib/prices";
import type { Account, Holding } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HoldingsDialog({
  account,
  onChanged,
}: {
  account: Account;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    return getStorage()
      .getHoldings(account.id)
      .then((list) => {
        setHoldings(list);
        setError(null);
      });
  }

  useEffect(() => {
    if (open) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account.id]);

  async function afterMutation() {
    await syncAccountValues(getStorage(), [account.id]);
    await reload();
    onChanged();
  }

  async function handleDelete(id: string) {
    await getStorage().deleteHolding(id);
    await afterMutation();
  }

  const total = holdings.reduce(
    (sum, h) => sum + h.units * (h.lastPrice ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Holdings">
          <Briefcase className="text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>{account.name} — holdings</DialogTitle>
        <DialogDescription>
          The account&apos;s value auto-syncs to the sum of its holdings
          {holdings.length > 0 && (
            <>
              {" "}
              (currently <span data-amount>{formatCurrency(total)}</span>)
            </>
          )}
          .
        </DialogDescription>

        {holdings.length > 0 && (
          <ul className="max-h-48 divide-y divide-border overflow-y-auto">
            {holdings.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{h.name}</span>
                  <span className="block text-xs text-muted-foreground" data-amount>
                    {h.units} units × {h.lastPrice != null ? formatCurrency(h.lastPrice) : "no price"}
                    {h.lastPriceAt && ` (as of ${h.lastPriceAt})`}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-sm font-medium" data-amount>
                    {formatCurrency(h.units * (h.lastPrice ?? 0))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remove holding"
                    onClick={() => handleDelete(h.id)}
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {account.type === "mutual_fund" ? (
          <AddMfHolding accountId={account.id} onAdded={afterMutation} onError={setError} />
        ) : (
          <AddManualHolding accountId={account.id} onAdded={afterMutation} />
        )}

        {error && <p className="text-sm text-negative">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

function AddMfHolding({
  accountId,
  onAdded,
  onError,
}: {
  accountId: string;
  onAdded: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MfSearchResult[]>([]);
  const [selected, setSelected] = useState<MfSearchResult | null>(null);
  const [units, setUnits] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const shouldSearch = query.trim().length >= 3 && !selected;
    const timer = setTimeout(
      () => {
        if (!shouldSearch) {
          setResults([]);
          return;
        }
        searchSchemes(query)
          .then((r) => {
            setResults(r.slice(0, 15));
            onError(null);
          })
          .catch(() =>
            onError("Fund search failed — check your internet connection."),
          );
      },
      shouldSearch ? 350 : 0,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  async function handleAdd() {
    if (!selected) return;
    const unitCount = Number(units);
    if (!Number.isFinite(unitCount) || unitCount <= 0) return;
    setBusy(true);
    onError(null);
    try {
      const latest = await fetchLatestNav(String(selected.schemeCode));
      await getStorage().saveHolding({
        id: uid(),
        accountId,
        name: selected.schemeName,
        identifier: String(selected.schemeCode),
        units: unitCount,
        lastPrice: latest?.nav,
        lastPriceAt: latest?.date,
      });
      setQuery("");
      setSelected(null);
      setUnits("");
      await onAdded();
    } catch {
      onError("Couldn't fetch the NAV — the holding was not added. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="mf-search">Add mutual fund</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="mf-search"
          className="pl-8"
          placeholder="Search fund name, e.g. Parag Parikh Flexi Cap"
          value={selected ? selected.schemeName : query}
          onChange={(e) => {
            setSelected(null);
            setQuery(e.target.value);
          }}
        />
      </div>
      {results.length > 0 && !selected && (
        <ul className="max-h-40 overflow-y-auto rounded-md border border-border text-sm">
          {results.map((r) => (
            <li key={r.schemeCode}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left hover:bg-muted"
                onClick={() => setSelected(r)}
              >
                {r.schemeName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="mf-units">Units</Label>
            <Input
              id="mf-units"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 142.357"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} disabled={busy}>
            <Plus /> {busy ? "Adding…" : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}

function AddManualHolding({
  accountId,
  onAdded,
}: {
  accountId: string;
  onAdded: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    const unitCount = Number(units);
    const unitPrice = Number(price);
    if (!name.trim() || unitCount <= 0 || unitPrice <= 0) return;
    setBusy(true);
    try {
      await getStorage().saveHolding({
        id: uid(),
        accountId,
        name: name.trim(),
        units: unitCount,
        lastPrice: unitPrice,
        lastPriceAt: new Date().toISOString().slice(0, 10),
      });
      setName("");
      setUnits("");
      setPrice("");
      await onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Add holding (price entered manually)</Label>
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_7rem_auto]">
        <Input
          placeholder="e.g. TCS"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="number"
          min="0"
          step="any"
          placeholder="Qty"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
        />
        <Input
          type="number"
          min="0"
          step="any"
          placeholder="Price ₹"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Button onClick={handleAdd} disabled={busy}>
          <Plus /> Add
        </Button>
      </div>
    </div>
  );
}
