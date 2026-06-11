/**
 * Core domain model. Every entity carries a string `id` (UUID) so records can
 * move between storage backends (IndexedDB today, cloud later) without
 * re-keying.
 */

export type AccountKind = "asset" | "liability";

export type AccountType =
  // Assets
  | "savings"
  | "cash"
  | "mutual_fund"
  | "stocks"
  | "ppf"
  | "epf"
  | "nps"
  | "fd"
  | "rd"
  | "gold"
  | "real_estate"
  | "crypto"
  | "other_asset"
  // Liabilities
  | "credit_card"
  | "home_loan"
  | "personal_loan"
  | "car_loan"
  | "education_loan"
  | "other_liability";

export const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; kind: AccountKind }
> = {
  savings: { label: "Savings Account", kind: "asset" },
  cash: { label: "Cash", kind: "asset" },
  mutual_fund: { label: "Mutual Funds", kind: "asset" },
  stocks: { label: "Stocks", kind: "asset" },
  ppf: { label: "PPF", kind: "asset" },
  epf: { label: "EPF", kind: "asset" },
  nps: { label: "NPS", kind: "asset" },
  fd: { label: "Fixed Deposit", kind: "asset" },
  rd: { label: "Recurring Deposit", kind: "asset" },
  gold: { label: "Gold", kind: "asset" },
  real_estate: { label: "Real Estate", kind: "asset" },
  crypto: { label: "Crypto", kind: "asset" },
  other_asset: { label: "Other Asset", kind: "asset" },
  credit_card: { label: "Credit Card", kind: "liability" },
  home_loan: { label: "Home Loan", kind: "liability" },
  personal_loan: { label: "Personal Loan", kind: "liability" },
  car_loan: { label: "Car Loan", kind: "liability" },
  education_loan: { label: "Education Loan", kind: "liability" },
  other_liability: { label: "Other Liability", kind: "liability" },
};

/**
 * Optional auto-growth rules for accounts whose value follows a schedule
 * (PPF, EPF, NPS, FD, RD…). The app projects the value forward from the last
 * manual update instead of waiting for the user to type it in each month.
 */
export interface AccountRules {
  /** Annual interest rate in percent, e.g. 7.1 for PPF. */
  annualRatePct: number;
  /** Fixed deposit added on a schedule (SIP/EPF contribution/RD installment). */
  contributionAmount?: number;
  /** Months between contributions: 1 = monthly, 3 = quarterly, 12 = yearly. */
  contributionEveryMonths?: 1 | 3 | 12;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Denormalized from type for fast asset/liability queries. */
  kind: AccountKind;
  /** Latest known value in INR. Liabilities store the outstanding amount as a positive number. */
  currentValue: number;
  /**
   * When set, the displayed value is projected forward from currentValue as of
   * updatedAt using these rules. Editing the value resets the baseline.
   */
  rules?: AccountRules;
  institution?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Soft delete — archived accounts keep their snapshot history. */
  archivedAt?: string;
}

/** A position inside an account, e.g. units of a fund or shares of a stock. */
export interface Holding {
  id: string;
  accountId: string;
  name: string;
  /** ISIN, ticker or folio number. */
  identifier?: string;
  units: number;
  avgCostPerUnit?: number;
  lastPrice?: number;
  lastPriceAt?: string;
}

/**
 * The value of one account on one date. Snapshots are the source of truth for
 * all "over time" charts; they are written by the monthly close flow.
 */
export interface Snapshot {
  id: string;
  accountId: string;
  /** YYYY-MM-DD */
  date: string;
  value: number;
}

export type TransactionType = "income" | "expense" | "investment" | "transfer";

export interface Transaction {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Always positive; direction is given by type. */
  amount: number;
  type: TransactionType;
  categoryId?: string;
  accountId?: string;
  description?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
}

/** A custom savings target, tracked against net worth. */
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  /** Optional YYYY-MM-DD deadline for on-track/behind verdicts. */
  targetDate?: string;
  createdAt: string;
}

/** Free-form app settings persisted alongside the data (e.g. allocation targets). */
export interface Setting {
  key: string;
  value: unknown;
}

/** Target percentage per allocation bucket, keyed by bucket name. */
export type AllocationTargets = Record<string, number>;
export const ALLOCATION_TARGETS_KEY = "allocationTargets";

/** Shape of the Export/Import JSON backup file. */
export interface ExportData {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  accounts: Account[];
  holdings: Holding[];
  snapshots: Snapshot[];
  transactions: Transaction[];
  categories: Category[];
  /** Added in schema v2; absent from older backups. */
  goals?: Goal[];
  settings?: Setting[];
}

export const SCHEMA_VERSION = 2;
