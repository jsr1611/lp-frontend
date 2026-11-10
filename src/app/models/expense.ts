export type EntryType = 'expense' | 'income';

export interface Expense{
  _id?: string; // Unique identifier for each expense (e.g., UUID or MongoDB ObjectId)
  userId?: string,
  date: string; // Date in ISO format (yyyy-MM-dd)
  category: string; // Category of the expense (e.g., "Food", "Transport", etc.)
  amount: number; // Amount of the expense
  type?: EntryType; // money out (default) or money in
  description?: string; // Optional description or note about the expense
  createdAt?: string; // Timestamp when the expense was added (ISO format)
  updatedAt?: string; // Optional timestamp for when the expense was last updated
  // Read-only rows derived from loans (see backend loanFlows):
  // and from confirmed pay (overtime payslips, gig payments):
  source?: 'loan' | 'salary' | 'gig';
  jobId?: string;
  workMonth?: string; // payslip's worked month, "YYYY-MM"
  payerName?: string;
  loanId?: string;
  loanEvent?: 'taken' | 'repayment';
  direction?: 'borrowed' | 'lent';
  contactName?: string;
}