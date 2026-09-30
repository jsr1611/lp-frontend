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

// 'statutory' follows 근로기준법 §60 (1/month in year one, 15+ each anniversary, each
// lapsing after a year); 'flat' is perMonth days a month that never lapse.
export type LeaveMode = 'statutory' | 'flat';

export interface LeaveSettings {
  mode: LeaveMode;
  accrualStart?: string;  // ISO date; empty = company.contractStart
  perMonth?: number;      // flat mode only
  // The balance HR reported on a date, to calibrate a ledger started mid-job.
  balanceAsOf?: { days?: number | null; date?: string };
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
  // Contracted weekdays, 0 = Sunday. Anything outside is a rest day.
  workDays: number[];
  // 휴일근로수당 (근로기준법 §56②): 1.5x for the first 8 hours of rest-day work, 2.0x
  // beyond. Settings rather than constants, for employers who pay a flat rate.
  restDayFirst8Multiplier: number;
  restDayBeyondMultiplier: number;
  // Whether minimumOtMinutes also gates rest days. Usually not.
  minimumOnRestDays: boolean;
  company?: CompanyInfo;
  leave?: LeaveSettings;
  // Milestone ids already celebrated. Written only through /milestones/seen.
  seenMilestones?: string[];
  created_at?: string;
  updated_at?: string;
}

// A Korean public holiday from the 공휴일 lookup.
export interface Holiday {
  date: string;  // ISO date (yyyy-MM-dd)
  name: string;  // e.g. "광복절", "대체공휴일"
}

// `available: false` means the lookup could not be made (no service key, upstream
// down) — NOT that the month has no holidays. Callers must not read an empty list as
// an answer; the manual toggle is the fallback.
export interface HolidayLookup {
  month: string;
  available: boolean;
  holidays: Holiday[];
  reason?: string;
}

export interface TimeAway {
  start: string;  // "HH:MM", left
  end: string;    // "HH:MM", came back
}

export interface OvertimeEntry {
  _id?: string;
  userId?: string;
  date: string;        // ISO date (yyyy-MM-dd); a night shift stays on its start date
  startTime: string;   // 출근 시간, "HH:MM"
  endTime: string;     // 퇴근 시간, "HH:MM"; earlier than startTime = ran past midnight
  // Stretches away mid-shift: left at start, back at end. startTime/endTime stay the
  // first arrival and the final departure.
  breaks?: TimeAway[];
  awayMinutes?: number;
  note?: string;
  // Weekend or 공휴일: every worked hour counts, at the 휴일근로 premium. Auto-detected
  // but overridable. `undefined` on entries logged before rest days were supported,
  // which is the signal to auto-detect on open.
  isRestDay?: boolean;
  restDayReason?: string;
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
  restDayFirst8Multiplier?: number;
  restDayBeyondMultiplier?: number;
  minimumOnRestDays?: boolean;
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
  isRestDay?: boolean;
  earnings: number;
  // Clock-in to clock-out, less time away and the unpaid break.
  workedMinutes: number;
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
  // The rate the month's entries were priced at, or null when they disagree — a raise
  // mid-month means no single rate applied. Falls back to live settings for an empty
  // month.
  hourlyRate: number | null;
  otMultiplier: number | null;
  mixedRates: boolean;
  hasRestDays: boolean;
  byDay: OvertimeDay[];
  leaveUsed: number;        // days off in this month, taken or planned
  payslip: Payslip | null;
}

// A day of annual leave (연차). amount 0.5 = half day (반차).
export interface LeaveDay {
  _id?: string;
  date: string;  // ISO date
  amount: 0.5 | 1;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

// What the payslip paid for a month's overtime. `month` is the month the work was
// done, not the month it was paid.
export interface Payslip {
  _id?: string;
  month: string;
  paidOtMinutes?: number | null;
  paidOtAmount?: number | null;
  payDate?: string;
  note?: string;
  // From /summary: payslip minus logged. Negative = underpaid. Null when the payslip
  // left that figure out.
  diffMinutes?: number | null;
  diffAmount?: number | null;
}

// A dated grant, as the ledger reports "next" and "expiring" ones.
export interface LeaveEvent {
  days: number;
  on: string;
  inDays: number;
}

export interface LeaveLedger {
  mode: LeaveMode;
  accrualStart: string;
  accrued: number;
  used: number;
  planned: number;
  lapsed: number;
  overdrawn: number;
  adjustment: number;
  available: number;
  expiringSoon: LeaveEvent[];
  nextGrant: LeaveEvent | null;
  nextAnnualGrant: LeaveEvent | null;
}

export interface Tenure {
  start: string;
  started: boolean;
  startsIn?: number;
  dayNumber?: number;
  years?: number;
  months?: number;
  days?: number;
  totalMonths?: number;
  nextAnniversary?: { year: number; on: string; inDays: number; progress: number };
  daysLeftInMonth: number;
  workdaysLeftInMonth: number;
  workdaysApproximate: boolean;
  contractEnd: string | null;
  contractEndsIn: number | null;
}

export type MilestoneKind = 'days' | 'months' | 'years' | 'hours' | 'earnings';

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  value: number;
  on?: string;          // date-based kinds only
  leaveDays?: number;   // years, statutory mode: the grant that lands with it
  currency?: string;    // earnings
  // Reached:
  seen?: boolean;
  celebrate?: boolean;
  // Upcoming:
  inDays?: number;
  soon?: boolean;
  remaining?: number;   // hours / earnings still to go
}

// Figures that span the whole job rather than one month.
export interface OvertimeOverview {
  today?: string;
  tenure: Tenure | null;
  leave: LeaveLedger | null;
  milestones: { reached: Milestone[]; upcoming: Milestone[] } | null;
}

// Result of the client-side preview shown while filling in the daily form.
export interface OvertimePreview {
  rawOtMinutes: number;
  paidOtMinutes: number;
  qualified: boolean;
  earnings: number;
}
