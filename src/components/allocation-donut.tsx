"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/config";
import type { AllocationSlice } from "@/lib/networth";
import type { AllocationTargets } from "@/lib/types";

const DRIFT_ALERT_PP = 5;

export function AllocationDonut({
  data,
  targets = {},
}: {
  data: AllocationSlice[];
  targets?: AllocationTargets;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-48 w-48 shrink-0" data-amount>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="bucket"
              innerRadius="62%"
              outerRadius="95%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((slice) => (
                <Cell key={slice.bucket} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--card-foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid w-full gap-2">
        {data.map((slice) => {
          const actualPct = total > 0 ? (slice.value / total) * 100 : 0;
          const targetPct = targets[slice.bucket];
          const drift = targetPct != null ? actualPct - targetPct : null;
          const drifted = drift != null && Math.abs(drift) > DRIFT_ALERT_PP;
          return (
            <li key={slice.bucket} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: slice.color }}
                />
                {slice.bucket}
              </span>
              <span className="text-right text-muted-foreground" data-amount>
                {formatCurrency(slice.value)} · {actualPct.toFixed(0)}%
                {drift != null && (
                  <span
                    className={drifted ? "ml-1 font-medium text-negative" : "ml-1"}
                    title={`Target ${targetPct}%`}
                  >
                    (target {targetPct}% · {drift >= 0 ? "+" : ""}
                    {drift.toFixed(0)})
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
