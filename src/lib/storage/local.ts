import { db } from "../db";
import {
  SCHEMA_VERSION,
  type Account,
  type Category,
  type ExportData,
  type Holding,
  type Snapshot,
  type Transaction,
} from "../types";
import { APP_NAME } from "../config";
import { uid } from "../utils";
import type { StorageAdapter } from "./adapter";

const DEFAULT_CATEGORIES: Array<Pick<Category, "name" | "type" | "color">> = [
  { name: "Salary", type: "income", color: "#10b981" },
  { name: "Other Income", type: "income", color: "#34d399" },
  { name: "Rent", type: "expense", color: "#f59e0b" },
  { name: "Groceries", type: "expense", color: "#84cc16" },
  { name: "Food & Dining", type: "expense", color: "#ef4444" },
  { name: "Transport", type: "expense", color: "#3b82f6" },
  { name: "Utilities & Bills", type: "expense", color: "#8b5cf6" },
  { name: "Shopping", type: "expense", color: "#ec4899" },
  { name: "Health", type: "expense", color: "#14b8a6" },
  { name: "Entertainment", type: "expense", color: "#f97316" },
  { name: "Travel", type: "expense", color: "#06b6d4" },
  { name: "EMI", type: "expense", color: "#64748b" },
  { name: "Other", type: "expense", color: "#9ca3af" },
];

/** IndexedDB-backed storage. All data stays on the user's device. */
export class LocalStorageAdapter implements StorageAdapter {
  async getAccounts(includeArchived = false): Promise<Account[]> {
    const all = await db.accounts.toArray();
    const accounts = includeArchived ? all : all.filter((a) => !a.archivedAt);
    return accounts.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAccount(id: string): Promise<Account | undefined> {
    return db.accounts.get(id);
  }

  async saveAccount(account: Account): Promise<void> {
    await db.accounts.put(account);
  }

  async archiveAccount(id: string): Promise<void> {
    await db.accounts.update(id, { archivedAt: new Date().toISOString() });
  }

  async deleteAccount(id: string): Promise<void> {
    await db.transaction("rw", [db.accounts, db.holdings, db.snapshots], async () => {
      await db.holdings.where("accountId").equals(id).delete();
      await db.snapshots.where("accountId").equals(id).delete();
      await db.accounts.delete(id);
    });
  }

  async getHoldings(accountId?: string): Promise<Holding[]> {
    if (accountId) {
      return db.holdings.where("accountId").equals(accountId).toArray();
    }
    return db.holdings.toArray();
  }

  async saveHolding(holding: Holding): Promise<void> {
    await db.holdings.put(holding);
  }

  async deleteHolding(id: string): Promise<void> {
    await db.holdings.delete(id);
  }

  async getSnapshots(opts?: {
    accountId?: string;
    from?: string;
    to?: string;
  }): Promise<Snapshot[]> {
    let snapshots: Snapshot[];
    if (opts?.accountId) {
      snapshots = await db.snapshots
        .where("accountId")
        .equals(opts.accountId)
        .toArray();
    } else {
      snapshots = await db.snapshots.toArray();
    }
    if (opts?.from) snapshots = snapshots.filter((s) => s.date >= opts.from!);
    if (opts?.to) snapshots = snapshots.filter((s) => s.date <= opts.to!);
    return snapshots.sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveSnapshots(snapshots: Snapshot[]): Promise<void> {
    await db.transaction("rw", db.snapshots, async () => {
      for (const snapshot of snapshots) {
        const existing = await db.snapshots
          .where("[accountId+date]")
          .equals([snapshot.accountId, snapshot.date])
          .first();
        await db.snapshots.put(existing ? { ...snapshot, id: existing.id } : snapshot);
      }
    });
  }

  async getTransactions(opts?: {
    from?: string;
    to?: string;
    type?: Transaction["type"];
  }): Promise<Transaction[]> {
    let txns = await db.transactions.toArray();
    if (opts?.from) txns = txns.filter((t) => t.date >= opts.from!);
    if (opts?.to) txns = txns.filter((t) => t.date <= opts.to!);
    if (opts?.type) txns = txns.filter((t) => t.type === opts.type);
    return txns.sort((a, b) => b.date.localeCompare(a.date));
  }

  async saveTransaction(txn: Transaction): Promise<void> {
    await db.transactions.put(txn);
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.transactions.delete(id);
  }

  async getCategories(): Promise<Category[]> {
    await this.seedDefaultCategoriesOnce();
    return db.categories.toArray();
  }

  async saveCategory(category: Category): Promise<void> {
    await db.categories.put(category);
  }

  async deleteCategory(id: string): Promise<void> {
    await db.categories.delete(id);
  }

  async exportData(): Promise<ExportData> {
    return {
      app: APP_NAME,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      accounts: await db.accounts.toArray(),
      holdings: await db.holdings.toArray(),
      snapshots: await db.snapshots.toArray(),
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
    };
  }

  async importData(data: ExportData): Promise<void> {
    if (data.schemaVersion > SCHEMA_VERSION) {
      throw new Error(
        `This backup was created by a newer version of ${APP_NAME}. Please update the app first.`,
      );
    }
    await db.transaction(
      "rw",
      [db.accounts, db.holdings, db.snapshots, db.transactions, db.categories],
      async () => {
        await Promise.all([
          db.accounts.clear(),
          db.holdings.clear(),
          db.snapshots.clear(),
          db.transactions.clear(),
          db.categories.clear(),
        ]);
        await db.accounts.bulkAdd(data.accounts ?? []);
        await db.holdings.bulkAdd(data.holdings ?? []);
        await db.snapshots.bulkAdd(data.snapshots ?? []);
        await db.transactions.bulkAdd(data.transactions ?? []);
        await db.categories.bulkAdd(data.categories ?? []);
      },
    );
  }

  async clearAll(): Promise<void> {
    await db.transaction(
      "rw",
      [db.accounts, db.holdings, db.snapshots, db.transactions, db.categories],
      async () => {
        await Promise.all([
          db.accounts.clear(),
          db.holdings.clear(),
          db.snapshots.clear(),
          db.transactions.clear(),
          db.categories.clear(),
        ]);
      },
    );
  }

  private async seedDefaultCategoriesOnce(): Promise<void> {
    const count = await db.categories.count();
    if (count > 0) return;
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() })),
    );
  }
}
