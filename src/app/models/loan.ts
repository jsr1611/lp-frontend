import { Currency } from "./user";

export type LoanDirection = 'borrowed' | 'lent'; // borrowed = you owe; lent = owed to you
export type LoanStatus = 'open' | 'partial' | 'paid';

export interface Repayment {
  _id?: string;
  date: string;   // ISO date (yyyy-MM-dd)
  amount: number;
  note?: string;
}

export interface Loan {
  _id?: string;
  userId?: string;
  direction: LoanDirection;
  contactId: string;
  contactName?: string;   // cached snapshot from the backend
  principal: number;
  currency: Currency;
  dateTaken: string;      // ISO date
  dueDate?: string;       // ISO date
  repayments?: Repayment[];
  status?: LoanStatus;
  note?: string;
  // Client-generated per new-loan; lets the backend dedupe double-submits/retries.
  idempotencyKey?: string;
  // Virtuals returned by the backend:
  totalRepaid?: number;
  remaining?: number;
  created_at?: string;
  updated_at?: string;
}

// One currency bucket in the summary totals.
export interface CurrencyTotal {
  currency: Currency;
  borrowedOutstanding: number;
  lentOutstanding: number;
  net: number; // lent - borrowed (positive => net owed to you)
}

// Running balance for one contact within one currency.
export interface ContactBalance {
  contactId: string;
  name: string;
  currency: Currency;
  borrowedRemaining: number;
  lentRemaining: number;
  net: number;
}

// A compact loan reference used in overdue / due-soon lists.
export interface DueEntry {
  _id: string;
  direction: LoanDirection;
  contactName: string;
  remaining: number;
  currency: Currency;
  dueDate: string;
}

export interface LoanSummary {
  byCurrency: CurrencyTotal[];
  byContact: ContactBalance[];
  overdue: DueEntry[];
  dueSoon: DueEntry[];
}

// Filters accepted by the loans list endpoint.
export interface LoanFilters {
  direction?: LoanDirection | '';
  status?: 'active' | 'open' | 'partial' | 'paid' | 'all';
  contactId?: string;
}
