import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { DeductionItem, MonthPay, OvertimeSummary, Payslip } from "src/app/models/overtime";
import { SecureService } from "src/app/services/SercureService";

// Won either side of the expected net still counted as a match.
const NET_TOLERANCE = 10;

// The payslip form works in hours, which is how payslips print them; the API in minutes.
interface PayslipForm {
  hours: number | null;
  amount: number | null;
  gross: number | null;
  net: number | null;
  payDate: string;
  note: string;
}

/**
 * What the payslip paid for the month's overtime, set against what was logged. The
 * difference is worked out by the backend (/summary) so it always reflects the
 * entries as they stand now.
 */
@Component({
  selector: "app-payslip-card",
  templateUrl: "./payslip-card.component.html",
  styleUrls: ["./payslip-card.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PayslipCardComponent {
  private readonly translate = inject(TranslateService);
  private readonly secureService = inject(SecureService);

  @Input() summary: OvertimeSummary | null = null;
  // The month being viewed: the work month the payslip is filed under.
  @Input() month = "";
  @Input() currencyCode = "KRW";
  // The parent's duration formatter, so "2h 30m" reads the same everywhere on the page.
  @Input() formatMinutes: (minutes: number) => string = (m) => `${m}m`;
  @Output() changed = new EventEmitter<void>();

  showModal = false;
  isSaving = false;
  errorMessage: string | null = null;
  form: PayslipForm = this.blankForm();

  get pay(): MonthPay | null {
    return this.summary?.pay ?? null;
  }

  // The breakdown to show: off the payslip's own gross when entered, else the estimate.
  get deductionItems(): DeductionItem[] {
    return (this.payslip?.expectedDeductions ?? this.pay?.deductions)?.items ?? [];
  }

  get expectedNet(): number | null {
    return this.payslip?.expectedNet ?? this.pay?.net ?? null;
  }

  // "+₩1,200" / "−₩1,200".
  signed(amount: number): string {
    const abs = Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 });
    return (amount > 0 ? "+" : amount < 0 ? "−" : "") + abs;
  }

  get payslip(): Payslip | null {
    return this.summary?.payslip ?? null;
  }

  // Signed duration: "+1h", "−2h 30m". The minus is U+2212 to match the table's badges.
  signedMinutes(minutes: number): string {
    if (!minutes) return this.formatMinutes(0);
    return (minutes > 0 ? "+" : "−") + this.formatMinutes(Math.abs(minutes));
  }

  // 'under' when either figure came up short, 'over' when paid more, 'match' otherwise.
  get status(): "under" | "over" | "match" | null {
    const p = this.payslip;
    if (!p) return null;
    // Net is checked with a small tolerance: insurances are truncated per item, so an
    // honest payslip can land a few won off the estimate.
    const net = typeof p.diffNet === "number" && Math.abs(p.diffNet) <= NET_TOLERANCE ? 0 : p.diffNet;
    const diffs = [p.diffMinutes, p.diffAmount, net].filter((d): d is number => typeof d === "number");
    if (diffs.some((d) => d < 0)) return "under";
    if (diffs.some((d) => d > 0)) return "over";
    return "match";
  }

  open(): void {
    const p = this.payslip;
    this.form = p
      ? {
          hours: typeof p.paidOtMinutes === "number" ? Math.round((p.paidOtMinutes / 60) * 100) / 100 : null,
          amount: p.paidOtAmount ?? null,
          gross: p.grossPaid ?? null,
          net: p.netPaid ?? null,
          payDate: p.payDate ? String(p.payDate).slice(0, 10) : "",
          note: p.note || "",
        }
      : this.blankForm();
    this.errorMessage = null;
    this.showModal = true;
  }

  close(): void {
    this.showModal = false;
    this.errorMessage = null;
  }

  save(): void {
    if (this.isSaving) return;
    const filled = (v: number | null) => v !== null && (v as any) !== "";
    const hasHours = filled(this.form.hours);
    const hasAmount = filled(this.form.amount);
    if (![this.form.hours, this.form.amount, this.form.gross, this.form.net].some(filled)) {
      this.errorMessage = this.translate.instant("overtime.payslip.needOne");
      return;
    }
    this.isSaving = true;
    this.errorMessage = null;
    this.secureService
      .savePayslip({
        month: this.month,
        paidOtMinutes: hasHours ? Math.round(Number(this.form.hours) * 60) : null,
        paidOtAmount: hasAmount ? Number(this.form.amount) : null,
        grossPaid: filled(this.form.gross) ? Number(this.form.gross) : null,
        netPaid: filled(this.form.net) ? Number(this.form.net) : null,
        payDate: this.form.payDate || undefined,
        note: this.form.note || undefined,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showModal = false;
          this.changed.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving = false;
          this.errorMessage = err.error?.message || err.message;
        },
      });
  }

  remove(): void {
    if (!confirm(this.translate.instant("overtime.payslip.deleteConfirm", { month: this.month }))) return;
    this.secureService.deletePayslip(this.month).subscribe({
      next: () => {
        this.showModal = false;
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => (this.errorMessage = err.error?.message || err.message),
    });
  }

  private blankForm(): PayslipForm {
    return { hours: null, amount: null, gross: null, net: null, payDate: "", note: "" };
  }
}
