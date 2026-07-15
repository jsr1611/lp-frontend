import { Currency } from "./user";

export type ShiftType = 'day' | 'night';
export type SalaryPeriod = 'monthly' | 'annual';
// How overtime minutes are cut before they are paid.
export type OtRounding = 'exact' | 'down30' | 'down60';

// Optional employment details. Nothing here affects the overtime maths — it is stored
// so later stats can put earnings in context (overtime vs base pay, trend since hire).
export interface CompanyInfo {
  name?: string;
  position?: string;
  contractStart?: string;   // ISO date
  contractEnd?: string;     // ISO date
  contractSalary?: number;  // in the same currency as OvertimeSettings.currency
  salaryPeriod?: SalaryPeriod;
  note?: string;
}

export interface OvertimeSettings {
  _id?: string;
  userId?: string;
  hourlyRate: number;
  currency: Currency;
  // 1.5x is the statutory Korean overtime rate (근로기준법 §56); night work between
  // 22:00-06:00 earns a further 0.5x, which is why 2.0x is offered for night shifts.
  otMultiplier: number;
  shiftType: ShiftType;
  shiftStart: string;        // scheduled clock-in, "HH:MM"
  workHours: number;         // contracted hours, excluding the lunch break
  lunchBreakMinutes: number;
  // Overtime below this earns nothing at all. 0 = no minimum.
  minimumOtMinutes: number;
  // Whether clocking in before shiftStart counts toward overtime.
  countEarlyArrival: boolean;
  rounding: OtRounding;
  company?: CompanyInfo;
  created_at?: string;
  updated_at?: string;
}

export interface OvertimeEntry {
  _id?: string;
  userId?: string;
  date: string;        // ISO date (yyyy-MM-dd); a night shift stays on its start date
  startTime: string;   // 출근 시간, "HH:MM"
  endTime: string;     // 퇴근 시간, "HH:MM"; earlier than startTime = ran past midnight
  note?: string;
  // Snapshot of the settings this day was logged under; the backend copies these in so
  // a later raise cannot rewrite what past months paid.
  hourlyRate?: number;
  otMultiplier?: number;
  currency?: Currency;
  shiftStart?: string;
  workHours?: number;
  lunchBreakMinutes?: number;
  minimumOtMinutes?: number;
  countEarlyArrival?: boolean;
  rounding?: OtRounding;
  // Derived by the backend:
  rawOtMinutes?: number;   // overtime actually worked
  paidOtMinutes?: number;  // what pays out: 0 if under the minimum, else rounded down
  qualified?: boolean;
  earnings?: number;
  created_at?: string;
  updated_at?: string;
}

// One day's contribution to the monthly summary.
export interface OvertimeDay {
  _id: string;
  date: string;
  rawOtMinutes: number;
  paidOtMinutes: number;
  qualified: boolean;
  earnings: number;
}

export interface OvertimeSummary {
  month: string;            // "YYYY-MM"
  totalRawMinutes: number;
  totalPaidMinutes: number;
  // Overtime worked that earned nothing — missed the minimum or lost to rounding.
  unpaidMinutes: number;
  totalEarnings: number;
  daysLogged: number;
  daysQualified: number;
  currency: Currency | null;
  byDay: OvertimeDay[];
}

// Result of the client-side preview shown while filling in the daily form.
export interface OvertimePreview {
  rawOtMinutes: number;
  paidOtMinutes: number;
  qualified: boolean;
  earnings: number;
}
