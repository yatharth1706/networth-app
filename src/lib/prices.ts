import type { StorageAdapter } from "./storage";

/**
 * Live mutual fund NAVs via mfapi.in — a free, no-auth JSON API over AMFI's
 * daily NAV data, callable straight from the browser so prices never route
 * through any server of ours.
 */
const MFAPI_BASE = "https://api.mfapi.in";

export interface MfSearchResult {
  schemeCode: number;
  schemeName: string;
}

export async function searchSchemes(query: string): Promise<MfSearchResult[]> {
  const res = await fetch(
    `${MFAPI_BASE}/mf/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`Scheme search failed (${res.status})`);
  return (await res.json()) as MfSearchResult[];
}

export async function fetchLatestNav(
  schemeCode: string,
): Promise<{ nav: number; date: string } | null> {
  const res = await fetch(`${MFAPI_BASE}/mf/${schemeCode}/latest`);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data?: Array<{ date: string; nav: string }>;
  };
  const latest = body.data?.[0];
  if (!latest) return null;
  const nav = Number(latest.nav);
  if (!Number.isFinite(nav) || nav <= 0) return null;
  // mfapi dates are dd-MM-yyyy; store ISO for consistency.
  const isoDate = latest.date.split("-").reverse().join("-");
  return { nav, date: isoDate };
}

export interface RefreshResult {
  updated: number;
  failed: number;
  accountsSynced: number;
}

/**
 * Refreshes the NAV of every holding that has a scheme code, then re-syncs
 * each affected account's current value to the sum of its holdings.
 */
export async function refreshAllNavs(
  storage: StorageAdapter,
): Promise<RefreshResult> {
  const holdings = await storage.getHoldings();
  const withCode = holdings.filter((h) => h.identifier && /^\d+$/.test(h.identifier));

  let updated = 0;
  let failed = 0;
  await Promise.allSettled(
    withCode.map(async (holding) => {
      const latest = await fetchLatestNav(holding.identifier!);
      if (!latest) {
        failed++;
        return;
      }
      await storage.saveHolding({
        ...holding,
        lastPrice: latest.nav,
        lastPriceAt: latest.date,
      });
      updated++;
    }),
  );

  const accountsSynced = await syncAccountValues(
    storage,
    [...new Set(withCode.map((h) => h.accountId))],
  );
  return { updated, failed, accountsSynced };
}

/** Sets each account's current value to the sum of its holdings' values. */
export async function syncAccountValues(
  storage: StorageAdapter,
  accountIds: string[],
): Promise<number> {
  let synced = 0;
  for (const accountId of accountIds) {
    const account = await storage.getAccount(accountId);
    if (!account) continue;
    const holdings = await storage.getHoldings(accountId);
    if (holdings.length === 0) continue;
    const total = Math.round(
      holdings.reduce((sum, h) => sum + h.units * (h.lastPrice ?? 0), 0),
    );
    if (total !== account.currentValue) {
      await storage.saveAccount({
        ...account,
        currentValue: total,
        updatedAt: new Date().toISOString(),
      });
    }
    synced++;
  }
  return synced;
}
