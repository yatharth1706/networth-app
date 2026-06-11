import Dexie, { type EntityTable } from "dexie";
import type {
  Account,
  Category,
  Goal,
  Holding,
  Setting,
  Snapshot,
  Transaction,
} from "./types";

/**
 * IndexedDB database (via Dexie). This is an implementation detail of
 * LocalStorageAdapter — app code should go through the StorageAdapter
 * interface in `storage/`, not import this directly.
 */
export class KoshDB extends Dexie {
  accounts!: EntityTable<Account, "id">;
  holdings!: EntityTable<Holding, "id">;
  snapshots!: EntityTable<Snapshot, "id">;
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  goals!: EntityTable<Goal, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("networth-app");
    this.version(1).stores({
      accounts: "id, type, kind",
      holdings: "id, accountId",
      snapshots: "id, accountId, date, [accountId+date]",
      transactions: "id, date, type, categoryId, accountId",
      categories: "id, type",
    });
    this.version(2).stores({
      goals: "id",
      settings: "key",
    });
  }
}

export const db = new KoshDB();
