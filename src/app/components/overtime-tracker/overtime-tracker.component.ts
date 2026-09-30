import { HttpErrorResponse } from "@angular/common/http";
import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
  inject,
} from "@angular/core";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { AuthService } from "src/app/services/AuthService";
import { SecureService } from "src/app/services/SercureService";
import {
  Holiday,
  HolidayLookup,
  LeaveDay,
  OvertimeEntry,
  OvertimeOverview,
  OvertimePreview,
  OvertimeSettings,
  OvertimeSummary,
} from "src/app/models/overtime";
import { Currency } from "src/app/models/user";
import { popularCurrencies, findCurrency, currencyNameKey } from "src/app/mappings/currencies";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

// Deliberately English and NOT localized. These are written to entry.restDayReason,
// which is persisted, and which the backend also populates in English. Localizing the
// write path would store a different language per entry depending on the UI language at
// the time, leaving the field unqueryable and old rows mismatched. Rendering it in the
// user's language needs a stable token in the data model — a backend contract change.
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MINUTES_PER_DAY = 24 * 60;
const HALF_DAY_MINUTES = 12 * 60;
// 휴일근로 earns the higher premium only past 8 hours (근로기준법 §56②).
const REST_DAY_PREMIUM_BREAK = 8 * 60;

// Average weeks in a month: 365 / 7 / 12.
const WEEKS_PER_MONTH = 365 / 7 / 12;
// Assumed working days per week. The one figure here that settings don't already know;
// a 5-day week covers essentially every salaried contract this page is aimed at.
const WORK_DAYS_PER_WEEK = 5;
// 주휴수당 (paid weekly rest day) applies from 15 contracted hours a week, and is
// capped at a single 8-hour day's pay.
const WEEKLY_REST_MIN_HOURS = 15;
const WEEKLY_REST_CAP_HOURS = 8;

// A dashed guide across the chart at the contracted day length. Drawn by a plugin
// rather than as a dataset, so it stays a reference mark and not a fourth series.
function contractedLine(hours: number) {
  return {
    id: "contractedLine",
    afterDatasetsDraw(chart: any) {
      const y = chart.scales.y.getPixelForValue(hours);
      const { left, right } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = "#6c757d";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label on a white chip at the left edge, so no bar can cover it.
      const label = `${hours}h`;
      ctx.font = "11px sans-serif";
      const w = ctx.measureText(label).width + 6;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(left + 2, y - 8, w, 16);
      ctx.fillStyle = "#495057";
      ctx.textBaseline = "middle";
      ctx.fillText(label, left + 5, y);
      ctx.restore();
    },
  };
}

// A choice in the "minimum overtime" dropdown, in minutes.
interface MinimumOption {
  minutes: number;
  labelKey: string;
}

// One weekday checkbox in the contracted-days picker.
interface WeekDayOption {
  value: number; // 0 = Sunday
  labelKey: string;
}

// A line in the month table: a worked day or a day off, interleaved by date.
type MonthRow =
  | { kind: "work"; id: string; date: string; entry: OvertimeEntry }
  | { kind: "leave"; id: string; date: string; leave: LeaveDay };

@Component({
    selector: "app-overtime-tracker",
    templateUrl: "./overtime-tracker.component.html",
    styleUrls: ["./overtime-tracker.component.css"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class OvertimeTrackerComponent implements OnInit {
  // Declared first: field initializers run in order, and inject() is only valid
  // inside the injection context these run in.
  private readonly translate = inject(TranslateService);

  protected token: string | null = null;

  popularCurrencies: Currency[] = popularCurrencies;
  protected currencyNameKey = currencyNameKey;

  // Data
  settings: OvertimeSettings | null = null;
  entries: OvertimeEntry[] = [];
  leaveDays: LeaveDay[] = [];
  // entries + leaveDays for the table, rebuilt when either loads rather than bound as a
  // getter — Eager change detection would rebuild the array every cycle.
  rows: MonthRow[] = [];
  summary: OvertimeSummary | null = null;
  // Tenure, leave balance and milestones: the whole job, not the month in view.
  overview: OvertimeOverview | null = null;

  // Gates the first paint: without it the setup form flashes before the GET lands.
  settingsLoaded = false;

  // Month being viewed, "YYYY-MM".
  month = this.currentMonth();

  // Setup / settings form
  showSettings = false;
  settingsForm: OvertimeSettings = this.blankSettings();
  isSavingSettings = false;

  // Daily entry modal
  showEntryModal = false;
  isEditingEntry = false;
  isSaving = false; // in-flight guard: disables Save and blocks re-entrant submits
  entryForm: OvertimeEntry = this.blankEntry();
  // Live result of the entry form, recomputed on each edit rather than bound as a
  // method call — Eager change detection would re-run a bound method every cycle.
  preview: OvertimePreview | null = null;
  // Total time away in the form, or why it is invalid — shown live under the rows.
  awayTotal = 0;
  awayError: string | null = null;
  // Set when editing a day that was logged under settings that have since changed.
  resnapshot = false;
  // The same modal logs a day off: no clock times, just the date and full or half.
  isDayOff = false;
  leaveForm: LeaveDay = { date: "", amount: 1, note: "" };

  // Public holidays, keyed by "YYYY-MM". Cached per month so re-opening the modal or
  // nudging the date does not re-hit the API.
  private holidayCache = new Map<string, HolidayLookup>();
  // Why the current entry counts as a rest day, for the modal to explain itself.
  restDayNote: string | null = null;
  // True when the 공휴일 lookup could not be made, so the UI can say that weekends are
  // still detected but 빨간날 need a manual tick.
  holidayLookupUnavailable = false;

  errorMessage: string | null = null;

  // Every half hour of the clock, so night shifts are selectable too.
  shiftStartOptions: string[] = this.buildTimeOptions();

  // Abbreviated weekday labels for the compact button group. Translated rather than
  // derived from the locale: there is no date to format here, and CLDR's abbreviated
  // names are full words in some languages (ar), which would break the button row.
  weekDayOptions: WeekDayOption[] = [
    { value: 1, labelKey: "overtime.weekdays.mon" },
    { value: 2, labelKey: "overtime.weekdays.tue" },
    { value: 3, labelKey: "overtime.weekdays.wed" },
    { value: 4, labelKey: "overtime.weekdays.thu" },
    { value: 5, labelKey: "overtime.weekdays.fri" },
    { value: 6, labelKey: "overtime.weekdays.sat" },
    { value: 0, labelKey: "overtime.weekdays.sun" },
  ];

  minimumOptions: MinimumOption[] = [
    { minutes: 0, labelKey: "overtime.minimums.none" },
    { minutes: 30, labelKey: "overtime.minimums.m30" },
    { minutes: 60, labelKey: "overtime.minimums.h1" },
    { minutes: 90, labelKey: "overtime.minimums.h1m30" },
    { minutes: 120, labelKey: "overtime.minimums.h2" },
    { minutes: 180, labelKey: "overtime.minimums.h3" },
    { minutes: 240, labelKey: "overtime.minimums.h4" },
  ];

  private otChart: any = null;

  constructor(
    private authService: AuthService,
    @Inject(Router) private router: Router,
    private secureService: SecureService
  ) {}

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.loadSettings();
  }

  // ---------- Loading ----------

  loadSettings(): void {
    this.secureService.getOvertimeSettings().subscribe({
      next: (data: any) => {
        this.settings = data.settings || null;
        this.settingsLoaded = true;
        if (!this.settings) {
          // First visit: nothing to show until the rate and rules are known.
          this.settingsForm = this.blankSettings();
          this.showSettings = true;
          return;
        }
        this.loadMonth();
        this.loadOverview();
      },
      error: (err: HttpErrorResponse) => {
        this.settingsLoaded = true;
        // Without a message here the page would render empty and silent: no settings
        // means no month view, and a failed load is not the same as "not set up yet".
        this.showError(err);
      },
    });
  }

  loadMonth(): void {
    this.loadEntries();
    this.loadLeaveDays();
    this.loadSummary();
  }

  loadEntries(): void {
    this.secureService.getOvertimeEntries(this.month).subscribe({
      next: (data: any) => {
        this.entries = data.entries || [];
        this.buildRows();
      },
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  loadLeaveDays(): void {
    this.secureService.getLeaveDays(this.month).subscribe({
      next: (data: any) => {
        this.leaveDays = data.leave || [];
        this.buildRows();
      },
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  loadOverview(): void {
    this.secureService.getOvertimeOverview(this.todayIso()).subscribe({
      next: (data: any) => (this.overview = data),
      // The month view works without it; the banner simply stays hidden.
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  // Anything that changes a balance or a total: the month and the overview both move.
  private reloadAll(): void {
    this.loadMonth();
    this.loadOverview();
  }

  private buildRows(): void {
    const rows: MonthRow[] = [
      ...this.entries.map((entry): MonthRow => ({
        kind: "work", id: `w${entry._id}`, date: this.isoDay(entry.date), entry,
      })),
      ...this.leaveDays.map((leave): MonthRow => ({
        kind: "leave", id: `l${leave._id}`, date: this.isoDay(leave.date), leave,
      })),
    ];
    // Newest first, like the entries endpoint.
    this.rows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  loadSummary(): void {
    this.secureService.getOvertimeSummary(this.month).subscribe({
      next: (data: any) => {
        this.summary = data;
        // Defer so the @if'd canvas exists in the DOM before drawing.
        setTimeout(() => this.drawChart(), 0);
      },
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  onMonthChange(): void {
    if (!this.month) return;
    this.loadMonth();
  }

  shiftMonth(delta: number): void {
    const [year, mon] = this.month.split("-").map(Number);
    // Day 1 keeps the roll-over honest: month 0 -> December of the previous year.
    const d = new Date(year, mon - 1 + delta, 1);
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    this.loadMonth();
  }

  // ---------- Settings ----------

  openSettings(): void {
    this.settingsForm = this.settings
      ? JSON.parse(JSON.stringify(this.settings))
      : this.blankSettings();
    if (!this.settingsForm.company) this.settingsForm.company = {};
    // Dates come back as full ISO instants; <input type="date"> only shows "yyyy-MM-dd"
    // and would otherwise render blank.
    const company = this.settingsForm.company;
    company.contractStart = this.isoDay(company.contractStart) || undefined;
    company.contractEnd = this.isoDay(company.contractEnd) || undefined;
    const leave = this.settingsForm.leave;
    this.settingsForm.leave = {
      mode: leave?.mode || "statutory",
      accrualStart: this.isoDay(leave?.accrualStart) || undefined,
      perMonth: leave?.perMonth ?? 1,
      balanceAsOf: {
        days: leave?.balanceAsOf?.days ?? null,
        date: this.isoDay(leave?.balanceAsOf?.date) || "",
      },
    };
    // Settings saved before rest-day support have none of these paths. Fill them in
    // rather than trust the server's defaults, so the form never binds to undefined.
    if (!this.settingsForm.workDays || !this.settingsForm.workDays.length) {
      this.settingsForm.workDays = [1, 2, 3, 4, 5];
    }
    this.settingsForm.restDayFirst8Multiplier = this.settingsForm.restDayFirst8Multiplier ?? 1.5;
    this.settingsForm.restDayBeyondMultiplier = this.settingsForm.restDayBeyondMultiplier ?? 2;
    this.settingsForm.minimumOnRestDays = this.settingsForm.minimumOnRestDays ?? false;
    this.errorMessage = null;
    this.showSettings = true;
  }

  closeSettings(): void {
    // The setup form is the only thing on screen until settings exist — there is
    // nothing to close back to.
    if (!this.settings) return;
    this.showSettings = false;
    this.errorMessage = null;
  }

  saveSettings(): void {
    if (this.isSavingSettings) return;
    if (!this.settingsForm.hourlyRate || this.settingsForm.hourlyRate <= 0) {
      this.errorMessage = this.translate.instant("overtime.errors.hourlyRateRequired");
      return;
    }
    // With no working days every day would be a rest day, silently doubling the pay.
    if (!this.settingsForm.workDays || !this.settingsForm.workDays.length) {
      this.errorMessage = this.translate.instant("overtime.errors.workDaysRequired");
      return;
    }
    // The HR balance only means something with the date it was true on.
    const cal = this.settingsForm.leave?.balanceAsOf;
    const hasCalDays = cal && cal.days !== null && cal.days !== undefined && (cal.days as any) !== "";
    if (cal && hasCalDays !== !!cal.date) {
      this.errorMessage = this.translate.instant("overtime.errors.balanceNeedsBoth");
      return;
    }
    this.isSavingSettings = true;
    this.errorMessage = null;
    this.secureService.saveOvertimeSettings(this.settingsForm).subscribe({
      next: (data: any) => {
        this.settings = data.data;
        this.isSavingSettings = false;
        this.showSettings = false;
        this.reloadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.isSavingSettings = false;
        this.showError(err);
      },
    });
  }

  // Paid hours in a month under Korean 통상시급 (ordinary hourly wage): contracted hours
  // plus 주휴, averaged over the year. A standard 40h week gives the familiar 209
  // ((40 + 8) x 4.345). Derived rather than pinned at 209, because that figure only
  // holds for a full-time 40-hour contract — a 7h/day contract works out at 182.
  get monthlyPaidHours(): number {
    const weekly = (this.settingsForm.workHours || 0) * WORK_DAYS_PER_WEEK;
    const weeklyRest =
      weekly >= WEEKLY_REST_MIN_HOURS
        ? Math.min(this.settingsForm.workHours, WEEKLY_REST_CAP_HOURS)
        : 0;
    return Math.round((weekly + weeklyRest) * WEEKS_PER_MONTH);
  }

  // Offered as a shortcut when the contract salary is filled in, since contracts quote
  // a salary far more often than an hourly rate. Only ever an estimate: which
  // allowances actually count toward 통상임금 is contract-specific, so the field stays
  // editable and this never fires on its own.
  estimateHourlyFromSalary(): void {
    const company = this.settingsForm.company;
    if (!company || !company.contractSalary) return;
    const monthly =
      company.salaryPeriod === "annual" ? company.contractSalary / 12 : company.contractSalary;
    const hours = this.monthlyPaidHours;
    if (!hours) return;
    this.settingsForm.hourlyRate = Math.round(monthly / hours);
  }

  get canEstimateHourly(): boolean {
    return !!(this.settingsForm.company && this.settingsForm.company.contractSalary);
  }

  onCurrencyChange(code: string): void {
    this.settingsForm.currency = findCurrency(code);
  }

  // A night shift's overtime lands after midnight, so 2.0x is the usual rate there
  // (근로기준법 §56: 1.5x overtime + 0.5x night premium). Nudge, don't force.
  onShiftTypeChange(): void {
    this.settingsForm.otMultiplier = this.settingsForm.shiftType === "night" ? 2 : 1.5;
    if (this.settingsForm.shiftType === "night" && this.settingsForm.shiftStart === "09:00") {
      this.settingsForm.shiftStart = "22:00";
    }
  }

  // ---------- Entries ----------

  // Log a new day off, or edit one from the table.
  openDayOffModal(leave?: LeaveDay): void {
    this.errorMessage = null;
    this.isDayOff = true;
    this.isEditingEntry = !!leave;
    this.leaveForm = leave
      ? { ...leave, date: this.isoDay(leave.date) }
      : { date: this.todayIso(), amount: 1, note: "" };
    this.showEntryModal = true;
  }

  // The day-off switch on a new record: carry the date across so it is not lost.
  onDayOffToggle(): void {
    if (this.isDayOff) {
      this.leaveForm = { date: this.entryForm.date, amount: 1, note: this.entryForm.note || "" };
    } else {
      this.entryForm.date = this.leaveForm.date;
      this.detectRestDay();
    }
  }

  openEntryModal(entry?: OvertimeEntry): void {
    this.errorMessage = null;
    this.isDayOff = false;
    this.resnapshot = false;
    this.restDayNote = null;
    if (entry) {
      this.isEditingEntry = true;
      this.entryForm = {
        ...entry,
        date: this.isoDay(entry.date),
        // Copied, so editing the rows does not change the table before saving.
        breaks: (entry.breaks || []).map((b) => ({ ...b })),
      };
    } else {
      this.isEditingEntry = false;
      this.entryForm = this.blankEntry();
    }
    // An entry logged before rest days existed has no isRestDay at all — undefined is
    // the signal to work it out, as opposed to an explicit false the user chose.
    if (this.entryForm.isRestDay === undefined) {
      this.detectRestDay();
    } else {
      this.describeRestDay();
      this.updatePreview();
    }
    this.showEntryModal = true;
  }

  // Re-detect whenever the date moves — the answer is a property of the date.
  onEntryDateChange(): void {
    this.detectRestDay();
  }

  // ---------- Time away ----------

  // A new row starts where the last one (or the clock-in) left off, one hour long.
  addTimeAway(): void {
    const breaks = (this.entryForm.breaks = this.entryForm.breaks || []);
    const from = breaks.length ? breaks[breaks.length - 1].end : "12:00";
    const t = (this.toMinutes(from || "12:00") + 60) % MINUTES_PER_DAY;
    const to = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    breaks.push({ start: from || "12:00", end: to });
    this.updatePreview();
  }

  removeTimeAway(index: number): void {
    this.entryForm.breaks?.splice(index, 1);
    this.updatePreview();
  }

  // A manual tick overrides detection; the reason becomes the user's own say-so.
  onRestDayToggle(): void {
    this.entryForm.restDayReason = this.entryForm.isRestDay ? "Marked by you" : undefined;
    this.describeRestDay();
    this.updatePreview();
  }

  /**
   * Work out whether the entry's date is a rest day.
   *
   * Weekends are settled locally from workDays and never need the network. Only 빨간날
   * need the lookup, and when it is unavailable the day stays a working day with a
   * note explaining that the user should tick the box themselves.
   */
  private detectRestDay(): void {
    if (!this.entryForm.date || !this.settings) return;

    const weekday = this.weekdayOf(this.entryForm.date);
    const workDays =
      this.settings.workDays && this.settings.workDays.length
        ? this.settings.workDays
        : [1, 2, 3, 4, 5];

    if (!workDays.includes(weekday)) {
      this.entryForm.isRestDay = true;
      this.entryForm.restDayReason = WEEKDAY_NAMES[weekday];
      this.describeRestDay();
      this.updatePreview();
      return;
    }

    const month = this.entryForm.date.slice(0, 7);
    this.loadHolidays(month, (lookup) => {
      // Only a successful lookup may clear the flag. If it failed, leave the day as a
      // working day but tell the user why we could not check.
      if (lookup.available) {
        const hit = (lookup.holidays || []).find((h: Holiday) => h.date === this.entryForm.date);
        this.entryForm.isRestDay = !!hit;
        this.entryForm.restDayReason = hit ? hit.name : undefined;
      } else {
        this.entryForm.isRestDay = false;
        this.entryForm.restDayReason = undefined;
      }
      this.describeRestDay();
      this.updatePreview();
    });
  }

  private loadHolidays(month: string, done: (lookup: HolidayLookup) => void): void {
    const cached = this.holidayCache.get(month);
    if (cached) {
      this.holidayLookupUnavailable = !cached.available;
      done(cached);
      return;
    }
    this.secureService.getOvertimeHolidays(month).subscribe({
      next: (data: any) => {
        const lookup: HolidayLookup = data;
        this.holidayCache.set(month, lookup);
        this.holidayLookupUnavailable = !lookup.available;
        done(lookup);
      },
      error: () => {
        // A holiday lookup failing must never block logging a day.
        const lookup: HolidayLookup = { month, available: false, holidays: [] };
        this.holidayCache.set(month, lookup);
        this.holidayLookupUnavailable = true;
        done(lookup);
      },
    });
  }

  // Plain-language reason shown under the rest-day toggle.
  //
  // `reason` is either a 공휴일 name straight from the API (Korean, and left exactly as
  // the backend sent it — it is data, not copy) or a weekday rendered in the UI
  // language. Either way it goes in as a parameter, so each language decides how the
  // sentence is built around it rather than having one spliced onto the front.
  private describeRestDay(): void {
    if (!this.entryForm.isRestDay) {
      this.restDayNote = null;
      return;
    }
    const reason = this.entryForm.restDayReason;
    this.restDayNote = reason
      ? this.translate.instant("overtime.restDayNotice", { reason })
      : this.translate.instant("overtime.restDayNoticeGeneric");
  }

  // A "yyyy-MM-dd" as the UTC-midnight instant the backend stores it at. Built from the
  // parts rather than parsed, so the calendar day never drifts with the viewer's zone.
  private utcDateOf(isoDate: string): Date {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  // Weekday of a "yyyy-MM-dd", read in UTC to match how the backend stores the date.
  private weekdayOf(isoDate: string): number {
    return this.utcDateOf(isoDate).getUTCDay();
  }

  // ---------- Work-day settings ----------

  isWorkDay(day: number): boolean {
    return !!this.settingsForm.workDays && this.settingsForm.workDays.includes(day);
  }

  toggleWorkDay(day: number): void {
    const days = this.settingsForm.workDays || [];
    this.settingsForm.workDays = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort();
  }

  closeEntryModal(): void {
    this.showEntryModal = false;
    this.errorMessage = null;
  }

  saveEntry(): void {
    if (this.isSaving) return;
    if (this.isDayOff) {
      this.saveDayOff();
      return;
    }
    if (!this.entryForm.date || !this.entryForm.startTime || !this.entryForm.endTime) {
      this.errorMessage = this.translate.instant("overtime.errors.entryFieldsRequired");
      return;
    }
    // Half-filled rows are dropped rather than rejected: an empty "Add time away" row
    // left behind should not block saving the day.
    this.entryForm.breaks = (this.entryForm.breaks || []).filter((b) => b.start && b.end);
    const away = this.awayMinutes(this.entryForm);
    if (away.errorKey) {
      this.errorMessage = this.translate.instant(away.errorKey);
      return;
    }
    this.isSaving = true;
    this.errorMessage = null;

    const request = this.isEditingEntry
      ? this.secureService.updateOvertimeEntry(this.entryForm, this.resnapshot)
      : this.secureService.saveOvertimeEntry(this.entryForm);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.showEntryModal = false;
        // The overview too: all-time hours may have crossed a milestone.
        this.reloadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.showError(err);
      },
    });
  }

  private saveDayOff(): void {
    if (!this.leaveForm.date) {
      this.errorMessage = this.translate.instant("overtime.errors.dateRequired");
      return;
    }
    this.isSaving = true;
    this.errorMessage = null;
    this.secureService.saveLeaveDay(this.leaveForm).subscribe({
      next: () => {
        this.isSaving = false;
        this.showEntryModal = false;
        this.reloadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.showError(err);
      },
    });
  }

  deleteEntry(entry: OvertimeEntry): void {
    if (!entry._id) return;
    const confirmMessage = this.translate.instant("overtime.deleteConfirm", {
      date: this.isoDay(entry.date),
    });
    if (!confirm(confirmMessage)) return;
    this.secureService.deleteOvertimeEntry(entry._id).subscribe({
      next: () => this.reloadAll(),
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

  deleteLeaveDay(leave: LeaveDay): void {
    if (!leave._id) return;
    const confirmMessage = this.translate.instant("overtime.leave.deleteConfirm", {
      date: this.isoDay(leave.date),
    });
    if (!confirm(confirmMessage)) return;
    this.secureService.deleteLeaveDay(leave._id).subscribe({
      next: () => this.reloadAll(),
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

  // Recomputed on every edit of the entry form.
  updatePreview(): void {
    const s = this.settings;
    const away = this.entryForm.startTime && this.entryForm.endTime ? this.awayMinutes(this.entryForm) : {};
    this.awayTotal = away.minutes || 0;
    this.awayError = away.errorKey ? this.translate.instant(away.errorKey) : null;
    if (!s || !this.entryForm.startTime || !this.entryForm.endTime) {
      this.preview = null;
      return;
    }
    // An edit keeps the day's original rate/rules unless resnapshot is ticked, so
    // preview against whichever set will actually be applied.
    const rules =
      this.isEditingEntry && !this.resnapshot ? this.rulesOf(this.entryForm, s) : s;
    this.preview = this.computeOvertime(this.entryForm, rules);
  }

  // ---------- Overtime maths ----------
  //
  // Mirrors computeOvertime() in arabic_backend/models/OvertimeEntry.js. The backend
  // stays authoritative — everything shown in the table and totals comes from what it
  // saved. This copy exists only so the entry form can show the result as it is typed.

  /**
   * Total time away, or the reason it is invalid. Mirrors awayMinutesOf() in
   * OvertimeEntry.js: each time lies on the shift's timeline, so anything earlier than
   * clock-in reads as after midnight.
   */
  private awayMinutes(entry: OvertimeEntry): { minutes?: number; errorKey?: string } {
    const start = this.toMinutes(entry.startTime);
    const onLine = (hhmm: string) => {
      const t = this.toMinutes(hhmm);
      return t < start ? t + MINUTES_PER_DAY : t;
    };
    let end = this.toMinutes(entry.endTime);
    if (end <= start) end += MINUTES_PER_DAY;

    const spans = (entry.breaks || [])
      .filter((b) => b.start && b.end)
      .map((b) => ({ from: onLine(b.start), to: onLine(b.end) }))
      .sort((a, b) => a.from - b.from);
    let minutes = 0;
    let last = start;
    for (const s of spans) {
      if (s.to <= s.from) return { errorKey: "overtime.away.errorOrder" };
      if (s.from < last) return { errorKey: "overtime.away.errorOverlap" };
      if (s.to > end) return { errorKey: "overtime.away.errorOutside" };
      minutes += s.to - s.from;
      last = s.to;
    }
    return { minutes };
  }

  private computeOvertime(entry: OvertimeEntry, rules: OvertimeSettings): OvertimePreview {
    const start = this.toMinutes(entry.startTime);
    // Clocking out at or before clock-in means the shift ran past midnight.
    let end = this.toMinutes(entry.endTime);
    if (end <= start) end += MINUTES_PER_DAY;

    const isRestDay = !!entry.isRestDay;
    const away = this.awayMinutes(entry).minutes || 0;
    let rawOtMinutes: number;

    if (isRestDay) {
      // No scheduled hours to subtract — the whole day is overtime, less the break the
      // law assumes was taken. Time away is a break too: the larger comes off, not both.
      const elapsed = end - start;
      rawOtMinutes = Math.max(0, elapsed - Math.max(away, this.statutoryBreak(elapsed)));
    } else {
      // Pull the scheduled start onto the same day as the actual one, so a night shift
      // logged just after midnight reads as slightly late rather than ~22 hours early.
      let shift = this.toMinutes(rules.shiftStart);
      if (shift - start > HALF_DAY_MINUTES) shift -= MINUTES_PER_DAY;
      else if (start - shift > HALF_DAY_MINUTES) shift += MINUTES_PER_DAY;

      // Time away has to be made up before overtime starts.
      const boundary = shift + rules.workHours * 60 + rules.lunchBreakMinutes + away;

      const eveningOt = Math.max(0, end - boundary);
      const earlyOt = rules.countEarlyArrival ? Math.max(0, shift - start) : 0;
      rawOtMinutes = eveningOt + earlyOt;
    }

    // The minimum is a cliff, tested before rounding, and a working-day rule unless the
    // employer extends it to rest days.
    const threshold = isRestDay && !rules.minimumOnRestDays ? 0 : rules.minimumOtMinutes || 0;
    const qualified = rawOtMinutes > 0 && rawOtMinutes >= threshold;

    let paidOtMinutes = qualified ? rawOtMinutes : 0;
    if (rules.rounding === "down30") paidOtMinutes = Math.floor(paidOtMinutes / 30) * 30;
    else if (rules.rounding === "down60") paidOtMinutes = Math.floor(paidOtMinutes / 60) * 60;

    let earnings: number;
    if (isRestDay) {
      // 휴일근로수당: the two blocks are weighted separately, not scaled by one rate.
      const firstBlock = Math.min(paidOtMinutes, REST_DAY_PREMIUM_BREAK);
      const beyondBlock = Math.max(0, paidOtMinutes - REST_DAY_PREMIUM_BREAK);
      const weighted =
        firstBlock * (rules.restDayFirst8Multiplier ?? 1.5) +
        beyondBlock * (rules.restDayBeyondMultiplier ?? 2);
      earnings = Math.round((weighted / 60) * rules.hourlyRate * 100) / 100;
    } else {
      earnings =
        Math.round((paidOtMinutes / 60) * rules.hourlyRate * rules.otMultiplier * 100) / 100;
    }

    return { rawOtMinutes, paidOtMinutes, qualified, earnings };
  }

  // 근로기준법 §54: at least 30 minutes' break per 4 hours worked, an hour per 8.
  // A weekday needs none of this — its lunch is already inside the boundary.
  private statutoryBreak(elapsedMinutes: number): number {
    if (elapsedMinutes >= 9 * 60) return 60;
    if (elapsedMinutes >= 4.5 * 60) return 30;
    return 0;
  }

  // The rules an existing entry was logged under, falling back to current settings for
  // anything an older record is missing.
  private rulesOf(entry: OvertimeEntry, fallback: OvertimeSettings): OvertimeSettings {
    return {
      ...fallback,
      hourlyRate: entry.hourlyRate ?? fallback.hourlyRate,
      otMultiplier: entry.otMultiplier ?? fallback.otMultiplier,
      shiftStart: entry.shiftStart ?? fallback.shiftStart,
      workHours: entry.workHours ?? fallback.workHours,
      lunchBreakMinutes: entry.lunchBreakMinutes ?? fallback.lunchBreakMinutes,
      minimumOtMinutes: entry.minimumOtMinutes ?? fallback.minimumOtMinutes,
      countEarlyArrival: entry.countEarlyArrival ?? fallback.countEarlyArrival,
      rounding: entry.rounding ?? fallback.rounding,
      currency: entry.currency ?? fallback.currency,
      // Statutory defaults, not the current settings: an entry logged before rest days
      // existed has no multipliers of its own, and a missing one would price a
      // Saturday at zero.
      restDayFirst8Multiplier: entry.restDayFirst8Multiplier ?? 1.5,
      restDayBeyondMultiplier: entry.restDayBeyondMultiplier ?? 2,
      minimumOnRestDays: entry.minimumOnRestDays ?? false,
    };
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
  }

  // ---------- Display helpers ----------
  // These return primitives, so binding them inside @for is safe under Eager change
  // detection (unlike a method returning a fresh array or object).

  // The unit suffixes and their spacing differ per language ("2h 30m", "2시간 30분"),
  // so the whole duration is built from a translated pattern rather than concatenated.
  // Bound once for child components, so they format durations the same way.
  readonly minutesFormatter = (minutes: number) => this.formatMinutes(minutes);

  formatMinutes(minutes: number | undefined): string {
    const m = minutes || 0;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    if (!h) return this.translate.instant("overtime.units.minutes", { m: rest });
    if (!rest) return this.translate.instant("overtime.units.hours", { h });
    return this.translate.instant("overtime.units.hoursMinutes", { h, m: rest });
  }

  // True when the shift ran past midnight, so the table can flag it.
  crossesMidnight(entry: OvertimeEntry): boolean {
    if (!entry.startTime || !entry.endTime) return false;
    return this.toMinutes(entry.endTime) <= this.toMinutes(entry.startTime);
  }

  // "Worked but unpaid" for a day: missed the minimum, or lost to rounding.
  lostMinutes(entry: OvertimeEntry): number {
    return Math.max(0, (entry.rawOtMinutes || 0) - (entry.paidOtMinutes || 0));
  }

  // What one overtime hour is actually worth: base rate x multiplier. Null when the
  // month mixes rates, since no single figure would be true.
  get effectiveOtRate(): number | null {
    if (!this.summary || !this.summary.hourlyRate || !this.summary.otMultiplier) return null;
    return Math.round(this.summary.hourlyRate * this.summary.otMultiplier * 100) / 100;
  }

  get currencyCode(): string {
    if (this.summary && this.summary.currency) return this.summary.currency.code;
    if (this.settings) return this.settings.currency.code;
    return "KRW";
  }

  // Human-readable one-liner for the rule in force, shown under the month header.
  get ruleSummary(): string {
    const s = this.settings;
    if (!s) return "";
    const parts: string[] = [];
    parts.push(
      this.translate.instant("overtime.rule.schedule", {
        start: s.shiftStart,
        hours: s.workHours,
      })
    );
    if (s.lunchBreakMinutes) {
      parts.push(
        this.translate.instant("overtime.rule.lunch", {
          duration: this.formatMinutes(s.lunchBreakMinutes),
        })
      );
    }
    parts.push(this.translate.instant("overtime.rule.overtimeAfter", { time: this.boundaryLabel }));
    if (s.minimumOtMinutes) {
      parts.push(
        this.translate.instant("overtime.rule.minimum", {
          duration: this.formatMinutes(s.minimumOtMinutes),
        })
      );
    }
    if (s.countEarlyArrival) parts.push(this.translate.instant("overtime.rule.earlyArrival"));
    parts.push(this.translate.instant("overtime.rule.multiplier", { value: s.otMultiplier }));
    return parts.join(" · ");
  }

  // The clock time at which overtime starts, derived from the scheduled day.
  get boundaryLabel(): string {
    return this.clockAfterSchedule(0);
  }

  // When overtime starts on the day in the form: later by however long you were away.
  get entryBoundaryLabel(): string {
    return this.clockAfterSchedule(this.awayTotal);
  }

  private clockAfterSchedule(extraMinutes: number): string {
    const s = this.settings;
    if (!s) return "";
    const total =
      this.toMinutes(s.shiftStart) + s.workHours * 60 + s.lunchBreakMinutes + extraMinutes;
    const wrapped = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const h = Math.floor(wrapped / 60);
    const m = wrapped % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // ---------- Chart ----------

  private drawChart(): void {
    const canvas: any = document.getElementById("overtimeByDayChart");
    if (!canvas || !this.summary) return;
    if (this.otChart) this.otChart.destroy();

    const days = this.summary.byDay || [];
    if (!days.length) return;

    const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
    // One bar per day whose full height is the hours worked: the regular part, then the
    // paid and unpaid overtime stacked on top. An early start just makes the bar taller.
    const regular = days.map((d) => hours(Math.max(0, (d.workedMinutes ?? 0) - d.rawOtMinutes)));
    const contracted = this.settings?.workHours ?? 8;

    this.otChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: days.map((d) => this.isoDay(d.date).slice(-2)),
        datasets: [
          {
            label: this.translate.instant("overtime.chart.regular"),
            data: regular,
            backgroundColor: "#b6c8e6",
          },
          {
            label: this.translate.instant("overtime.chart.paidOvertime"),
            data: days.map((d) => hours(d.paidOtMinutes)),
            backgroundColor: "#0d6efd",
          },
          {
            label: this.translate.instant("overtime.chart.unpaid"),
            data: days.map((d) => hours(d.rawOtMinutes - d.paidOtMinutes)),
            backgroundColor: "#dc3545",
          },
        ],
      },
      plugins: [contractedLine(contracted)],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              // Total for the day under the per-series lines.
              footer: (items) => {
                const d = days[items[0].dataIndex];
                return this.translate.instant("overtime.chart.workedTotal", {
                  time: this.formatMinutes(d.workedMinutes ?? 0),
                });
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: this.translate.instant("overtime.chart.dayOfMonth") },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            // Keep the contracted-hours guide on screen even in a light month.
            suggestedMax: contracted + 1,
            title: { display: true, text: this.translate.instant("overtime.chart.hours") },
          },
        },
      },
    });
  }

  // ---------- Blanks & utilities ----------

  private blankSettings(): OvertimeSettings {
    return {
      hourlyRate: 0,
      currency: findCurrency("KRW"),
      otMultiplier: 1.5,
      shiftType: "day",
      shiftStart: "09:00",
      workHours: 8,
      lunchBreakMinutes: 60,
      minimumOtMinutes: 0,
      countEarlyArrival: false,
      rounding: "down60",
      workDays: [1, 2, 3, 4, 5],
      restDayFirst8Multiplier: 1.5,
      restDayBeyondMultiplier: 2,
      minimumOnRestDays: false,
      company: {},
      leave: { mode: "statutory", perMonth: 1, balanceAsOf: { days: null, date: "" } },
    };
  }

  private blankEntry(): OvertimeEntry {
    const start = this.settings ? this.settings.shiftStart : "09:00";
    return {
      date: this.todayIso(),
      startTime: start,
      endTime: this.boundaryLabel || "18:00",
      breaks: [],
      note: "",
    };
  }

  // Half-hour steps across the whole clock: "00:00" ... "23:30".
  private buildTimeOptions(): string[] {
    const options: string[] = [];
    for (let m = 0; m < MINUTES_PER_DAY; m += 30) {
      options.push(
        `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
      );
    }
    return options;
  }

  // Local calendar day as yyyy-MM-dd. Built from local parts rather than
  // toISOString(), which in KST (UTC+9) would report yesterday before 09:00.
  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }

  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  // Entry dates are stored as UTC midnight, so slice the ISO string rather than going
  // through a local Date, which would drift the day for viewers west of UTC.
  isoDay(date: string | undefined): string {
    if (!date) return "";
    return String(date).slice(0, 10);
  }

  private showError(err: HttpErrorResponse): void {
    this.errorMessage = err.error && err.error.message ? err.error.message : err.message;
    this.handleAuthError(err);
  }

  private handleAuthError(err: HttpErrorResponse): void {
    console.error(err.error ? err.error.message : err.message);
    if (err.status === 401) {
      localStorage.removeItem("token");
      this.router.navigate(["/login"]);
    }
  }
}
