import type {
  Account,
  Category,
  ExportData,
  Holding,
  Snapshot,
  Transaction,
} from "../types";

/**
 * The contract every storage backend must satisfy. The whole UI talks to this
 * interface only. v1 ships LocalStorageAdapter (IndexedDB); a future
 * CloudAdapter implements the same interface and the UI is untouched.
 */
export interface StorageAdapter {
  // Accounts
  getAccounts(includeArchived?: boolean): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  saveAccount(account: Account): Promise<void>;
  archiveAccount(id: string): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  // Holdings
  getHoldings(accountId?: string): Promise<Holding[]>;
  saveHolding(holding: Holding): Promise<void>;
  deleteHolding(id: string): Promise<void>;

  // Snapshots
  getSnapshots(opts?: {
    accountId?: string;
    from?: string;
    to?: string;
  }): Promise<Snapshot[]>;
  /** Upserts by (accountId, date) so re-running a monthly close is idempotent. */
  saveSnapshots(snapshots: Snapshot[]): Promise<void>;

  // Transactions
  getTransactions(opts?: {
    from?: string;
    to?: string;
    type?: Transaction["type"];
  }): Promise<Transaction[]>;
  saveTransaction(txn: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  saveCategory(category: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  // Backup
  exportData(): Promise<ExportData>;
  /** Replaces all existing data with the contents of the backup. */
  importData(data: ExportData): Promise<void>;
  clearAll(): Promise<void>;
}
