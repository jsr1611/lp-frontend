import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { SecureService } from "src/app/services/SercureService";
import {
  Agency, GigJob, GigPayment, GigShift, MinimumWage, PayScheduleType, PendingPay,
} from "src/app/models/gig";
import { popularCurrencies, findCurrency, currencyNameKey } from "src/app/mappings/currencies";
import { Currency } from "src/app/models/user";

// The pay-shaped part of a shift form, shared by the shift modal and the agency
// defaults it is pre-filled from.
const MINUTES_PER_DAY = 24 * 60;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Gig / part-time work: shifts for several agencies, what each still owes, and the
 * payments that settled them. One page per gig job, at /gigs/:jobId (/gigs/new to set
 * one up).
 */
@Component({
  selector: "app-gig-tracker",
  templateUrl: "./gig-tracker.component.html",
  styleUrls: ["./gig-tracker.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class GigTrackerComponent implements OnInit {
  private readonly secure = inject(SecureService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly popularCurrencies: Currency[] = popularCurrencies;
  protected readonly currencyNameKey = currencyNameKey;
  readonly scheduleTypes: PayScheduleType[] = ["perShift", "nextDay", "weekly", "semimonthly", "monthly"];
  readonly weekdays = [1, 2, 3, 4, 5, 6, 0];

  jobId: string | null = null;
  job: GigJob | null = null;
  minimumWage: MinimumWage | null = null;
  loaded = false;
  errorMessage: string | null = null;

  month = this.currentMonth();
  shifts: GigShift[] = [];
  pending: PendingPay[] = [];
  payments: GigPayment[] = [];

  // Setup / edit form
  editing = false;
  jobForm: GigJob = this.blankJob();
  saving = false;

  // Shift modal
  shiftForm: GigShift | null = null;
  shiftError: string | null = null;

  // Mark-as-paid modal
  payForm: { agencyId: string; date: string; amount: number | null; note: string; selected: Record<string, boolean> } | null = null;
  payShifts: GigShift[] = [];
  payError: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get("jobId");
      this.jobId = id && id !== "new" ? id : null;
      this.job = null;
      this.loaded = false;
      if (!this.jobId) {
        this.jobForm = this.blankJob();
        this.editing = true;
        this.loaded = true;
        return;
      }
      this.loadJob();
    });
  }

  // ---------- Loading ----------

  loadJob(): void {
    this.errorMessage = null;
    this.secure.getGigJob(this.jobId!).subscribe({
      next: (data: any) => {
        this.job = data.job;
        this.minimumWage = data.minimumWage;
        this.loaded = true;
        // A gig job with no agencies cannot log a shift: go straight to setup.
        if (!this.activeAgencies.length) this.openEdit();
        this.reload();
      },
      error: (err) => this.fail(err),
    });
  }

  reload(): void {
    this.loadShifts();
    this.loadPending();
    this.loadPayments();
  }

  loadShifts(): void {
    this.secure.getGigShifts(this.jobId!, this.month).subscribe({
      next: (data: any) => { this.shifts = data.shifts || []; this.cdr.markForCheck(); },
      error: (err) => this.fail(err),
    });
  }

  loadPending(): void {
    this.secure.getGigPending(this.jobId!, this.todayIso()).subscribe({
      next: (data: any) => { this.pending = data.pending || []; this.cdr.markForCheck(); },
      error: (err) => this.fail(err),
    });
  }

  loadPayments(): void {
    this.secure.getGigPayments(this.jobId!).subscribe({
      next: (data: any) => { this.payments = (data.payments || []).slice(0, 10); this.cdr.markForCheck(); },
      error: (err) => this.fail(err),
    });
  }

  // ---------- Month ----------

  shiftMonth(delta: number): void {
    const [y, m] = this.month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    this.month = d.toISOString().slice(0, 7);
    this.loadShifts();
  }

  get monthTotals(): { shifts: number; minutes: number; gross: number; byAgency: { name: string; minutes: number; gross: number; shifts: number }[] } {
    const by = new Map<string, { name: string; minutes: number; gross: number; shifts: number }>();
    for (const s of this.shifts) {
      const row = by.get(s.agencyId) || { name: this.agencyName(s.agencyId), minutes: 0, gross: 0, shifts: 0 };
      row.minutes += s.minutes || 0;
      row.gross += s.gross || 0;
      row.shifts += 1;
      by.set(s.agencyId, row);
    }
    const byAgency = [...by.values()];
    return {
      shifts: this.shifts.length,
      minutes: byAgency.reduce((sum, a) => sum + a.minutes, 0),
      gross: byAgency.reduce((sum, a) => sum + a.gross, 0),
      byAgency,
    };
  }

  // ---------- Job & agencies ----------

  get activeAgencies(): Agency[] {
    return (this.job?.agencies || []).filter((a) => !a.archived);
  }

  agencyName(id: string): string {
    return this.job?.agencies.find((a) => a._id === id)?.name || "—";
  }

  agency(id: string): Agency | undefined {
    return this.job?.agencies.find((a) => a._id === id);
  }

  openEdit(): void {
    this.jobForm = this.job
      ? JSON.parse(JSON.stringify({ ...this.job, agencies: this.activeAgencies }))
      : this.blankJob();
    if (!this.jobForm.agencies.length) this.addAgency();
    this.errorMessage = null;
    this.editing = true;
  }

  cancelEdit(): void {
    if (!this.jobId) return this.backToJobs();
    this.editing = false;
    this.errorMessage = null;
  }

  addAgency(): void {
    this.jobForm.agencies.push({
      name: "",
      payType: "hourly",
      hourlyRate: null,
      flatAmount: null,
      amountIsNet: false,
      deductions: { mode: "tax33", rates: {} },
      paySchedule: { type: "nextDay", payDay: 10, weekday: 5, firstPayDay: 25, secondPayDay: 10 },
    });
  }

  removeAgency(i: number): void {
    this.jobForm.agencies.splice(i, 1);
  }

  compareCurrency = (a: Currency | null, b: Currency | null) => a?.code === b?.code;

  saveJob(): void {
    if (this.saving) return;
    const name = (this.jobForm.company?.name || "").trim();
    if (!name) return void (this.errorMessage = this.translate.instant("gig.errors.nameRequired"));
    if (!this.jobForm.agencies.length) return void (this.errorMessage = this.translate.instant("gig.errors.agencyRequired"));
    const payload = { ...this.jobForm, name } as any;
    this.saving = true;
    this.errorMessage = null;
    const req = this.jobId ? this.secure.saveGigJob(this.jobId, payload) : this.secure.createGigJob(payload);
    req.subscribe({
      next: (data: any) => {
        this.saving = false;
        this.editing = false;
        if (!this.jobId) {
          this.router.navigate(["/gigs", data.data._id], { replaceUrl: true });
          return;
        }
        this.job = data.data;
        this.reload();
        this.cdr.markForCheck();
      },
      error: (err) => { this.saving = false; this.fail(err); },
    });
  }

  // "+45% over the 2026 minimum" for an hourly rate, or a warning below it.
  rateVsMinimum(rate: number | null | undefined): { pct: number; below: boolean } | null {
    const min = this.minimumWage?.hourly ?? 10320;
    if (!rate || this.currencyCode !== "KRW") return null;
    const pct = Math.round(((rate - min) / min) * 100);
    return { pct, below: rate < min };
  }

  // ---------- Shifts ----------

  openShift(shift?: GigShift): void {
    const first = this.activeAgencies[0];
    this.shiftForm = shift
      ? { ...shift, date: String(shift.date).slice(0, 10) }
      : this.shiftFromAgency({ date: this.todayIso(), agencyId: first?._id || "", startTime: "09:00", endTime: "18:00", breakMinutes: 60 } as GigShift);
    this.shiftError = null;
  }

  // Picking an agency fills in how it usually pays; the shift can still change it.
  onShiftAgency(): void {
    if (this.shiftForm && !this.shiftForm._id) this.shiftForm = this.shiftFromAgency(this.shiftForm);
  }

  private shiftFromAgency(s: GigShift): GigShift {
    const a = this.agency(s.agencyId);
    return {
      ...s,
      payType: a?.payType || "hourly",
      hourlyRate: a?.hourlyRate ?? null,
      flatAmount: a?.flatAmount ?? null,
      amountIsNet: !!a?.amountIsNet,
    };
  }

  // Live figures for the shift modal, same rules as the backend's shiftMinutes/shiftPay.
  get shiftPreview(): { minutes: number; pay: number } {
    const s = this.shiftForm;
    if (!s) return { minutes: 0, pay: 0 };
    let minutes = 0;
    if (s.startTime && s.endTime) {
      const start = toMinutes(s.startTime);
      let end = toMinutes(s.endTime);
      if (end <= start) end += MINUTES_PER_DAY;
      minutes = Math.max(0, end - start - (Number(s.breakMinutes) || 0));
    }
    const pay = s.payType === "flat"
      ? Math.round(Number(s.flatAmount) || 0)
      : Math.round((minutes / 60) * (Number(s.hourlyRate) || 0));
    return { minutes, pay };
  }

  saveShift(): void {
    const s = this.shiftForm;
    if (!s) return;
    if (!s.agencyId) return void (this.shiftError = this.translate.instant("gig.errors.pickAgency"));
    this.shiftError = null;
    this.secure.saveGigShift(this.jobId!, s).subscribe({
      next: () => { this.shiftForm = null; this.reload(); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.shiftError = err.error?.message || err.message; this.cdr.markForCheck(); },
    });
  }

  deleteShift(shift: GigShift): void {
    const key = shift.paymentId ? "gig.confirmDeletePaidShift" : "gig.confirmDeleteShift";
    if (!confirm(this.translate.instant(key))) return;
    this.secure.deleteGigShift(this.jobId!, shift._id!).subscribe({
      next: () => { this.shiftForm = null; this.reload(); },
      error: (err) => this.fail(err),
    });
  }

  // ---------- Payments ----------

  openPay(p: PendingPay): void {
    this.payShifts = [];
    this.payForm = { agencyId: p.agencyId, date: this.todayIso(), amount: null, note: "", selected: {} };
    // Everything pending is ticked; untick what this payment did not cover.
    for (const id of p.shiftIds) this.payForm.selected[id] = true;
    this.payError = null;
    this.secure.getUnpaidGigShifts(this.jobId!, p.agencyId).subscribe({
      next: (data: any) => {
        this.payShifts = (data.shifts || []).sort((x: GigShift, y: GigShift) => String(x.date).localeCompare(String(y.date)));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.payError = err.error?.message || err.message; this.cdr.markForCheck(); },
    });
  }

  get selectedPayShifts(): GigShift[] {
    return this.payShifts.filter((s) => this.payForm?.selected[s._id!]);
  }

  // Expected take-home for the ticked shifts, matching the backend's takeHome().
  get payExpected(): { gross: number; net: number } {
    const a = this.payForm ? this.agency(this.payForm.agencyId) : undefined;
    const shifts = this.selectedPayShifts;
    const isNet = (s: GigShift) => s.payType === "flat" && s.amountIsNet;
    const taxed = shifts.filter((s) => !isNet(s)).reduce((sum, s) => sum + (s.gross || 0), 0);
    const already = shifts.filter(isNet).reduce((sum, s) => sum + (s.gross || 0), 0);
    return { gross: taxed + already, net: this.afterDeductions(taxed, a) + already };
  }

  private afterDeductions(gross: number, a?: Agency): number {
    const mode = a?.deductions?.mode || "none";
    const r = a?.deductions?.rates || {};
    const pct = (k: string, d: number) => (typeof (r as any)[k] === "number" ? (r as any)[k] : d);
    if (mode === "tax33") {
      const total = pct("businessTax", 3.3);
      const income = Math.floor(gross * (total / 100) * (10 / 11));
      return gross - income - Math.floor(income / 10);
    }
    if (mode === "insurance4") {
      const health = Math.floor(gross * (pct("health", 3.595) / 100));
      const cut =
        Math.floor(gross * (pct("pension", 4.75) / 100)) + health +
        Math.floor(health * (pct("longTermCare", 13.14) / 100)) +
        Math.floor(gross * (pct("employment", 0.9) / 100)) +
        Math.floor(gross * (pct("incomeTax", 0) / 100));
      return gross - cut;
    }
    return gross;
  }

  savePayment(): void {
    const f = this.payForm;
    if (!f) return;
    const shiftIds = Object.keys(f.selected).filter((id) => f.selected[id]);
    if (!shiftIds.length) return void (this.payError = this.translate.instant("gig.errors.pickShift"));
    this.secure.recordGigPayment(this.jobId!, {
      agencyId: f.agencyId,
      date: f.date,
      amount: f.amount === null || (f.amount as any) === "" ? null : Number(f.amount),
      shiftIds,
      note: f.note || undefined,
    }).subscribe({
      next: () => { this.payForm = null; this.reload(); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.payError = err.error?.message || err.message; this.cdr.markForCheck(); },
    });
  }

  undoPayment(p: GigPayment): void {
    if (!confirm(this.translate.instant("gig.confirmUndoPayment"))) return;
    this.secure.deleteGigPayment(this.jobId!, p._id!).subscribe({
      next: () => this.reload(),
      error: (err) => this.fail(err),
    });
  }

  // ---------- Formatting ----------

  get currencyCode(): string {
    return this.job?.currency?.code || this.jobForm.currency?.code || "KRW";
  }

  hours(minutes: number | undefined): string {
    const m = minutes || 0;
    const h = Math.floor(m / 60);
    return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  }

  backToJobs(): void {
    this.router.navigate(["/overtime"]);
  }

  todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  private currentMonth(): string {
    return this.todayIso().slice(0, 7);
  }

  private blankJob(): GigJob {
    return { company: { name: "" }, currency: findCurrency("KRW") || ({ code: "KRW", name: "South Korean Won", symbol: "₩" } as Currency), agencies: [] };
  }

  private fail(err: HttpErrorResponse): void {
    this.loaded = true;
    this.errorMessage = err?.error?.message || err?.message || this.translate.instant("gig.errors.generic");
    this.cdr.markForCheck();
  }
}
