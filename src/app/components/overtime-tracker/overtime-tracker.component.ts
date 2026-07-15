import { HttpErrorResponse } from "@angular/common/http";
import { Component, Inject, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "src/app/services/AuthService";
import { SecureService } from "src/app/services/SercureService";
import {
  OvertimeEntry,
  OvertimePreview,
  OvertimeSettings,
  OvertimeSummary,
} from "src/app/models/overtime";
import { Currency } from "src/app/models/user";
import { popularCurrencies, findCurrency } from "src/app/mappings/currencies";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const MINUTES_PER_DAY = 24 * 60;
const HALF_DAY_MINUTES = 12 * 60;

// Average weeks in a month: 365 / 7 / 12.
const WEEKS_PER_MONTH = 365 / 7 / 12;
// Assumed working days per week. The one figure here that settings don't already know;
// a 5-day week covers essentially every salaried contract this page is aimed at.
const WORK_DAYS_PER_WEEK = 5;
// 주휴수당 (paid weekly rest day) applies from 15 contracted hours a week, and is
// capped at a single 8-hour day's pay.
const WEEKLY_REST_MIN_HOURS = 15;
const WEEKLY_REST_CAP_HOURS = 8;

// A choice in the "minimum overtime" dropdown, in minutes.
interface MinimumOption {
  minutes: number;
  label: string;
}

@Component({
    selector: "app-overtime-tracker",
    templateUrl: "./overtime-tracker.component.html",
    styleUrls: ["./overtime-tracker.component.css"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class OvertimeTrackerComponent implements OnInit {
  protected token: string | null = null;

  popularCurrencies: Currency[] = popularCurrencies;

  // Data
  settings: OvertimeSettings | null = null;
  entries: OvertimeEntry[] = [];
  summary: OvertimeSummary | null = null;

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
  // Set when editing a day that was logged under settings that have since changed.
  resnapshot = false;

  errorMessage: string | null = null;

  // Every half hour of the clock, so night shifts are selectable too.
  shiftStartOptions: string[] = this.buildTimeOptions();

  minimumOptions: MinimumOption[] = [
    { minutes: 0, label: "No minimum — every minute counts" },
    { minutes: 30, label: "30 minutes" },
    { minutes: 60, label: "1 hour" },
    { minutes: 90, label: "1 hour 30 minutes" },
    { minutes: 120, label: "2 hours" },
    { minutes: 180, label: "3 hours" },
    { minutes: 240, label: "4 hours" },
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
    this.loadSummary();
  }

  loadEntries(): void {
    this.secureService.getOvertimeEntries(this.month).subscribe({
      next: (data: any) => (this.entries = data.entries || []),
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
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
      this.errorMessage = "Enter your base hourly rate.";
      return;
    }
    this.isSavingSettings = true;
    this.errorMessage = null;
    this.secureService.saveOvertimeSettings(this.settingsForm).subscribe({
      next: (data: any) => {
        this.settings = data.data;
        this.isSavingSettings = false;
        this.showSettings = false;
        this.loadMonth();
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

  openEntryModal(entry?: OvertimeEntry): void {
    this.errorMessage = null;
    this.resnapshot = false;
    if (entry) {
      this.isEditingEntry = true;
      this.entryForm = {
        ...entry,
        date: this.isoDay(entry.date),
      };
    } else {
      this.isEditingEntry = false;
      this.entryForm = this.blankEntry();
    }
    this.updatePreview();
    this.showEntryModal = true;
  }

  closeEntryModal(): void {
    this.showEntryModal = false;
    this.errorMessage = null;
  }

  saveEntry(): void {
    if (this.isSaving) return;
    if (!this.entryForm.date || !this.entryForm.startTime || !this.entryForm.endTime) {
      this.errorMessage = "Date, start time and end time are all required.";
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
        this.loadMonth();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.showError(err);
      },
    });
  }

  deleteEntry(entry: OvertimeEntry): void {
    if (!entry._id) return;
    if (!confirm(`Delete the entry for ${this.isoDay(entry.date)}?`)) return;
    this.secureService.deleteOvertimeEntry(entry._id).subscribe({
      next: () => this.loadMonth(),
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

  // Recomputed on every edit of the entry form.
  updatePreview(): void {
    const s = this.settings;
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

  private computeOvertime(entry: OvertimeEntry, rules: OvertimeSettings): OvertimePreview {
    const start = this.toMinutes(entry.startTime);
    // Clocking out at or before clock-in means the shift ran past midnight.
    let end = this.toMinutes(entry.endTime);
    if (end <= start) end += MINUTES_PER_DAY;

    // Pull the scheduled start onto the same day as the actual one, so a night shift
    // logged just after midnight reads as slightly late rather than ~22 hours early.
    let shift = this.toMinutes(rules.shiftStart);
    if (shift - start > HALF_DAY_MINUTES) shift -= MINUTES_PER_DAY;
    else if (start - shift > HALF_DAY_MINUTES) shift += MINUTES_PER_DAY;

    const boundary = shift + rules.workHours * 60 + rules.lunchBreakMinutes;

    const eveningOt = Math.max(0, end - boundary);
    const earlyOt = rules.countEarlyArrival ? Math.max(0, shift - start) : 0;
    const rawOtMinutes = eveningOt + earlyOt;

    // The minimum is a cliff, tested before rounding.
    const threshold = rules.minimumOtMinutes || 0;
    const qualified = rawOtMinutes > 0 && rawOtMinutes >= threshold;

    let paidOtMinutes = qualified ? rawOtMinutes : 0;
    if (rules.rounding === "down30") paidOtMinutes = Math.floor(paidOtMinutes / 30) * 30;
    else if (rules.rounding === "down60") paidOtMinutes = Math.floor(paidOtMinutes / 60) * 60;

    const earnings =
      Math.round((paidOtMinutes / 60) * rules.hourlyRate * rules.otMultiplier * 100) / 100;

    return { rawOtMinutes, paidOtMinutes, qualified, earnings };
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
    };
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
  }

  // ---------- Display helpers ----------
  // These return primitives, so binding them inside @for is safe under Eager change
  // detection (unlike a method returning a fresh array or object).

  formatMinutes(minutes: number | undefined): string {
    const m = minutes || 0;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    if (!h) return `${rest}m`;
    if (!rest) return `${h}h`;
    return `${h}h ${rest}m`;
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
    parts.push(`${s.shiftStart} + ${s.workHours}h`);
    if (s.lunchBreakMinutes) parts.push(`${this.formatMinutes(s.lunchBreakMinutes)} lunch`);
    parts.push(`overtime after ${this.boundaryLabel}`);
    if (s.minimumOtMinutes) parts.push(`min ${this.formatMinutes(s.minimumOtMinutes)}`);
    if (s.countEarlyArrival) parts.push("early arrival counts");
    parts.push(`${s.otMultiplier}x`);
    return parts.join(" · ");
  }

  // The clock time at which overtime starts, derived from the scheduled day.
  get boundaryLabel(): string {
    const s = this.settings;
    if (!s) return "";
    const total = this.toMinutes(s.shiftStart) + s.workHours * 60 + s.lunchBreakMinutes;
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

    this.otChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: days.map((d) => this.isoDay(d.date).slice(-2)),
        datasets: [
          {
            label: "Paid overtime (h)",
            data: days.map((d) => Math.round((d.paidOtMinutes / 60) * 100) / 100),
            backgroundColor: "#0d6efd",
          },
          {
            label: "Unpaid (h)",
            data: days.map(
              (d) => Math.round(((d.rawOtMinutes - d.paidOtMinutes) / 60) * 100) / 100
            ),
            backgroundColor: "#dc3545",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, title: { display: true, text: "Day of month" } },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: "Hours" } },
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
      company: {},
    };
  }

  private blankEntry(): OvertimeEntry {
    const start = this.settings ? this.settings.shiftStart : "09:00";
    return {
      date: this.todayIso(),
      startTime: start,
      endTime: this.boundaryLabel || "18:00",
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
