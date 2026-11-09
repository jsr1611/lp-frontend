import { Currency } from "./user";
import { DeductionMode, DeductionRateKey } from "./overtime";

// Gig / part-time work: one job holding several agencies, shifts worked for them,
// and the payments that settled those shifts. Mirrors arabic_backend api/gigs.js.

export type GigPayType = "hourly" | "flat";
// When an agency's pay is expected. A forecast only — payments record what happened.
export type PayScheduleType = "perShift" | "nextDay" | "weekly" | "semimonthly" | "monthly";

export interface PaySchedule {
  type: PayScheduleType;
  weekday?: number;       // weekly: 0 = Sunday
  payDay?: number;        // monthly: day of the following month
  firstPayDay?: number;   // semimonthly: days 1-15 paid this day, same month
  secondPayDay?: number;  // semimonthly: days 16+ paid this day, next month
}

export interface Agency {
  _id?: string;
  name: string;
  payType: GigPayType;
  hourlyRate?: number | null;
  flatAmount?: number | null;
  // The flat amount is already after tax: no deductions come off it.
  amountIsNet?: boolean;
  deductions: { mode: DeductionMode; rates?: Partial<Record<DeductionRateKey, number | null>> };
  paySchedule: PaySchedule;
  archived?: boolean;
  note?: string;
}

export interface GigJob {
  _id?: string;
  employmentType?: "parttime";
  company?: { name?: string; note?: string };
  currency: Currency;
  agencies: Agency[];
}

export interface MinimumWage {
  year: number;
  hourly: number;
  currency: string;
}

export interface GigShift {
  _id?: string;
  agencyId: string;
  date: string;            // yyyy-MM-dd
  startTime?: string;      // "HH:MM"; optional on a flat-paid shift
  endTime?: string;
  breakMinutes?: number;
  payType: GigPayType;
  hourlyRate?: number | null;
  flatAmount?: number | null;
  amountIsNet?: boolean;
  note?: string;
  paymentId?: string | null;
  // Derived by the backend:
  minutes?: number;
  gross?: number;          // for an after-tax flat shift, the take-home amount
  payDue?: string;         // expected pay day under the agency's schedule
}

export interface PendingPay {
  agencyId: string;
  agencyName: string | null;
  shifts: number;
  shiftIds: string[];
  minutes: number;
  gross: number;
  net: number;
  nextPayDay: string;
  overdue: boolean;
}

export interface GigPayment {
  _id?: string;
  agencyId: string;
  date: string;
  amount?: number | null;
  shiftIds: string[];
  expectedGross?: number;
  expectedNet?: number;
  // amount - expectedNet; null when no amount was entered.
  diff?: number | null;
  note?: string;
}

// The gig part of a jobs-list row.
export interface GigJobStats {
  agencies: number;
  shifts: number;
  lastLogged: string | null;
  totalMinutes: number;
  totalGross: number;
  monthMinutes: number;
  monthGross: number;
  pendingShifts: number;
  pendingNet: number;
  nextPayDay: string | null;
  overdue: boolean;
}
