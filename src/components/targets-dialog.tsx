"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { ALLOCATION_BUCKETS, type AllocationSlice } from "@/lib/networth";
import { ALLOCATION_TARGETS_KEY, type AllocationTargets } from "@/lib/types";
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

export function TargetsDialog({
  targets,
  allocation,
  onChanged,
}: {
  targets: AllocationTargets;
  allocation: AllocationSlice[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Buckets you hold something in come first; the rest are still settable.
  const held = new Set(allocation.map((a) => a.bucket));
  const buckets = [...ALLOCATION_BUCKETS].sort(
    (a, b) => Number(held.has(b)) - Number(held.has(a)),
  );

  function reset() {
    setDraft(
      Object.fromEntries(
        ALLOCATION_BUCKETS.map((b) => [b, targets[b] ? String(targets[b]) : ""]),
      ),
    );
  }

  const totalPct = Object.values(draft).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const next: AllocationTargets = {};
      for (const [bucket, value] of Object.entries(draft)) {
        const pct = Number(value);
        if (Number.isFinite(pct) && pct > 0) next[bucket] = pct;
      }
      await getStorage().setSetting(ALLOCATION_TARGETS_KEY, next);
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
        <Button variant="outline" size="sm">
          <SlidersHorizontal /> {Object.keys(targets).length > 0 ? "Edit targets" : "Set targets"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Allocation targets</DialogTitle>
        <DialogDescription>
          Your intended mix, in percent. The allocation card flags drift of
          more than 5 points from any target.
        </DialogDescription>
        <form onSubmit={handleSave} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            {buckets.map((bucket) => (
              <div key={bucket} className="grid gap-1.5">
                <Label htmlFor={`target-${bucket}`}>{bucket}</Label>
                <Input
                  id={`target-${bucket}`}
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="—"
                  value={draft[bucket] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [bucket]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <p
            className={
              totalPct > 100
                ? "text-sm font-medium text-negative"
                : "text-sm text-muted-foreground"
            }
          >
            Total: {totalPct.toFixed(0)}%{totalPct > 100 && " — over 100%"}
          </p>
          <Button type="submit" disabled={busy || totalPct > 100} className="justify-self-start">
            {busy ? "Saving…" : "Save targets"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
