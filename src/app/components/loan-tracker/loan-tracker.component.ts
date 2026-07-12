import { HttpErrorResponse } from "@angular/common/http";
import { Component, Inject, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "src/app/services/AuthService";
import { SecureService } from "src/app/services/SercureService";
import { Contact } from "src/app/models/contact";
import {
  Loan,
  LoanDirection,
  LoanFilters,
  LoanSummary,
  Repayment,
} from "src/app/models/loan";
import { Currency } from "src/app/models/user";
import { popularCurrencies, findCurrency } from "src/app/mappings/currencies";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

// A quick-contact link (WhatsApp / Telegram / call / email).
interface ContactLink {
  icon: string;
  url: string;
  title: string;
  cls: string;
}

// Per-currency running balance for one contact's whole history.
interface DetailTotal {
  code: string;
  currency: Currency;
  borrowed: number;
  lent: number;
  net: number;
}

@Component({
    selector: "app-loan-tracker",
    templateUrl: "./loan-tracker.component.html",
    styleUrls: ["./loan-tracker.component.css"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class LoanTrackerComponent implements OnInit {
  protected token: string | null = null;

  popularCurrencies: Currency[] = popularCurrencies;
  defaultCurrencyCode = "UZS";

  // Data
  loans: Loan[] = [];
  contacts: Contact[] = [];
  summary: LoanSummary = { byCurrency: [], byContact: [], overdue: [], dueSoon: [] };

  // List filters
  filters: LoanFilters = { direction: "", status: "active" };

  // Loan add/edit modal
  showLoanModal = false;
  isEditingLoan = false;
  loanForm: Loan = this.blankLoan();

  // Contact selection inside the loan modal: pick existing or add new inline.
  contactMode: "existing" | "new" = "existing";
  newContact: Contact = { name: "" };
  contactPickerSupported = false;

  // Repayment modal
  showRepaymentModal = false;
  repaymentLoan: Loan | null = null;
  newRepayment: Repayment = { date: this.todayIso(), amount: 0, note: "" };

  // Per-person detail modal
  showContactDetail = false;
  detailContact: Contact | null = null;
  detailLoans: Loan[] = [];
  detailTotals: DetailTotal[] = [];

  // Charts (typed as any, matching the dashboard/user-page chart pattern)
  chartCurrencyCode = "";
  private balanceChart: any = null;
  private personChart: any = null;

  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    @Inject(Router) private router: Router,
    private secureService: SecureService
  ) {}

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.contactPickerSupported =
      "contacts" in navigator && "ContactsManager" in window;
    const savedCurrency = localStorage.getItem("currency");
    if (savedCurrency) {
      this.defaultCurrencyCode = savedCurrency;
    }
    this.loadUserCurrency();
    this.loadContacts();
    this.loadLoans();
    this.loadSummary();
  }

  // ---------- helpers ----------
  private todayIso(): string {
    return new Date().toISOString().split("T")[0];
  }

  private blankLoan(): Loan {
    return {
      direction: "borrowed",
      contactId: "",
      principal: 0,
      currency: findCurrency(this.defaultCurrencyCode || "UZS"),
      dateTaken: this.todayIso(),
      dueDate: "",
      note: "",
      repayments: [],
    };
  }

  private toIsoDate(value: string | undefined): string {
    if (!value) return "";
    return new Date(value).toISOString().split("T")[0];
  }

  private handleAuthError(err: HttpErrorResponse): void {
    console.error(err.error ? err.error.message : err.message);
    if (err.status === 401) {
      localStorage.removeItem("token");
      this.router.navigate(["/login"]);
    }
  }

  remaining(loan: Loan): number {
    if (loan.remaining !== undefined) return loan.remaining;
    const repaid = (loan.repayments || []).reduce((s, r) => s + (r.amount || 0), 0);
    return Math.round((loan.principal - repaid) * 100) / 100;
  }

  isOverdue(loan: Loan): boolean {
    return (
      !!loan.dueDate &&
      loan.status !== "paid" &&
      new Date(loan.dueDate) < new Date(this.todayIso())
    );
  }

  isDueSoon(loan: Loan): boolean {
    if (!loan.dueDate || loan.status === "paid") return false;
    const due = new Date(loan.dueDate);
    const now = new Date(this.todayIso());
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= soon;
  }

  directionLabel(direction: LoanDirection): string {
    return direction === "borrowed" ? "I owe" : "Owed to me";
  }

  // ---------- contact deep-links ----------
  contactById(id: string): Contact | undefined {
    return this.contacts.find((c) => c._id === id);
  }

  // Build the available quick-contact links for a contact (only channels that exist).
  contactLinks(contact: Contact | undefined): ContactLink[] {
    if (!contact) return [];
    const links: ContactLink[] = [];
    const waNumber = (contact.whatsapp || contact.phone || "").replace(/[^\d]/g, "");
    if (waNumber) {
      links.push({ icon: "bi-whatsapp", url: `https://wa.me/${waNumber}`, title: "WhatsApp", cls: "text-success" });
    }
    const tg = (contact.telegram || "").replace(/^@/, "").trim();
    if (tg) {
      links.push({ icon: "bi-telegram", url: `https://t.me/${tg}`, title: "Telegram", cls: "text-primary" });
    }
    const tel = (contact.phone || "").replace(/[^\d+]/g, "");
    if (tel) {
      links.push({ icon: "bi-telephone", url: `tel:${tel}`, title: "Call", cls: "text-secondary" });
    }
    if (contact.email) {
      links.push({ icon: "bi-envelope", url: `mailto:${contact.email}`, title: "Email", cls: "text-secondary" });
    }
    return links;
  }

  // ---------- per-person detail ----------
  openContactDetail(contactId: string): void {
    this.errorMessage = null;
    this.detailContact = this.contactById(contactId) || null;
    this.secureService.getLoans({ contactId, status: "all" }).subscribe({
      next: (data: any) => {
        this.detailLoans = data.loans || [];
        this.computeDetailTotals();
        this.showContactDetail = true;
      },
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  closeContactDetail(): void {
    this.showContactDetail = false;
    this.detailContact = null;
    this.detailLoans = [];
    this.detailTotals = [];
  }

  private computeDetailTotals(): void {
    const map: { [code: string]: DetailTotal } = {};
    this.detailLoans.forEach((loan) => {
      const code = loan.currency.code;
      if (!map[code]) {
        map[code] = { code, currency: loan.currency, borrowed: 0, lent: 0, net: 0 };
      }
      if (loan.status !== "paid") {
        const rem = this.remaining(loan);
        if (loan.direction === "borrowed") {
          map[code].borrowed = Math.round((map[code].borrowed + rem) * 100) / 100;
        } else {
          map[code].lent = Math.round((map[code].lent + rem) * 100) / 100;
        }
        map[code].net = Math.round((map[code].lent - map[code].borrowed) * 100) / 100;
      }
    });
    this.detailTotals = Object.values(map);
  }

  // From the detail modal, jump to repayment/edit without stacking modals.
  detailAddRepayment(loan: Loan): void {
    this.closeContactDetail();
    this.openRepaymentModal(loan);
  }

  detailEditLoan(loan: Loan): void {
    this.closeContactDetail();
    this.openLoanModal(loan);
  }

  // ---------- charts ----------
  get chartCurrencies(): string[] {
    return this.summary.byCurrency.map((c) => c.currency.code);
  }

  drawCharts(): void {
    if (!this.summary.byCurrency.length) return;

    // Default to the currency with the largest outstanding total.
    if (!this.chartCurrencyCode || !this.chartCurrencies.includes(this.chartCurrencyCode)) {
      this.chartCurrencyCode = [...this.summary.byCurrency].sort(
        (a, b) => b.borrowedOutstanding + b.lentOutstanding - (a.borrowedOutstanding + a.lentOutstanding)
      )[0].currency.code;
    }
    const cur = this.summary.byCurrency.find((c) => c.currency.code === this.chartCurrencyCode);
    if (!cur) return;

    // Chart 1: borrowed vs lent outstanding.
    const ctx1 = document.getElementById("loanBalanceChart") as HTMLCanvasElement | null;
    if (ctx1) {
      if (this.balanceChart) this.balanceChart.destroy();
      this.balanceChart = new Chart(ctx1, {
        type: "doughnut",
        data: {
          labels: ["I owe", "Owed to me"],
          datasets: [{ data: [cur.borrowedOutstanding, cur.lentOutstanding], backgroundColor: ["#dc3545", "#198754"] }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
            title: { display: true, text: `Outstanding (${this.chartCurrencyCode})` },
          },
        },
      });
    }

    // Chart 2: net balance per person for this currency.
    const people = this.summary.byContact.filter((b) => b.currency.code === this.chartCurrencyCode);
    const ctx2 = document.getElementById("loanPersonChart") as HTMLCanvasElement | null;
    if (ctx2) {
      if (this.personChart) this.personChart.destroy();
      this.personChart = new Chart(ctx2, {
        type: "bar",
        data: {
          labels: people.map((p) => p.name),
          datasets: [
            {
              label: `Net balance (${this.chartCurrencyCode})`,
              data: people.map((p) => p.net),
              backgroundColor: people.map((p) => (p.net >= 0 ? "#198754" : "#dc3545")),
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true } },
          plugins: { legend: { display: false } },
        },
      });
    }
  }

  // ---------- loaders ----------
  loadUserCurrency(): void {
    this.authService.getUserProfile("one").subscribe({
      next: (data: any) => {
        if (data?.user?.currency?.code) {
          this.defaultCurrencyCode = data.user.currency.code;
          if (!this.showLoanModal) {
            this.loanForm.currency = findCurrency(this.defaultCurrencyCode);
          }
        }
      },
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  loadContacts(): void {
    this.secureService.getContacts().subscribe({
      next: (data: any) => (this.contacts = data.contacts || []),
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  loadLoans(): void {
    this.secureService.getLoans(this.filters).subscribe({
      next: (data: any) => (this.loans = data.loans || []),
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  loadSummary(): void {
    this.secureService.getLoanSummary().subscribe({
      next: (data: any) => {
        this.summary = data;
        // Defer so the *ngIf'd canvases exist in the DOM before drawing.
        setTimeout(() => this.drawCharts(), 0);
      },
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    });
  }

  applyFilters(): void {
    this.loadLoans();
  }

  private refresh(): void {
    this.loadLoans();
    this.loadSummary();
    this.loadContacts();
  }

  // ---------- loan modal ----------
  openLoanModal(loan?: Loan): void {
    this.errorMessage = null;
    this.contactMode = "existing";
    this.newContact = { name: "" };
    if (loan) {
      this.isEditingLoan = true;
      this.loanForm = {
        _id: loan._id,
        direction: loan.direction,
        contactId: loan.contactId,
        contactName: loan.contactName,
        principal: loan.principal,
        currency: loan.currency,
        dateTaken: this.toIsoDate(loan.dateTaken),
        dueDate: this.toIsoDate(loan.dueDate),
        note: loan.note,
        repayments: loan.repayments,
      };
    } else {
      this.isEditingLoan = false;
      this.loanForm = this.blankLoan();
    }
    this.showLoanModal = true;
  }

  closeLoanModal(): void {
    this.showLoanModal = false;
    this.errorMessage = null;
  }

  onCurrencyChange(code: string): void {
    this.loanForm.currency = findCurrency(code);
  }

  // Save loan: if adding a new contact inline, create it first, then the loan.
  saveLoan(): void {
    this.errorMessage = null;

    if (this.contactMode === "new") {
      if (!this.newContact.name || !this.newContact.name.trim()) {
        this.errorMessage = "Contact name is required.";
        return;
      }
      this.secureService.saveContact(this.newContact).subscribe({
        next: (data: any) => {
          const created: Contact = data.data;
          this.contacts.push(created);
          this.loanForm.contactId = created._id!;
          this.persistLoan();
        },
        error: (err: HttpErrorResponse) => this.showError(err),
      });
    } else {
      if (!this.loanForm.contactId) {
        this.errorMessage = "Please select a contact.";
        return;
      }
      this.persistLoan();
    }
  }

  private persistLoan(): void {
    if (!this.loanForm.principal || this.loanForm.principal <= 0) {
      this.errorMessage = "Amount must be greater than 0.";
      return;
    }
    const request = this.isEditingLoan
      ? this.secureService.updateLoan(this.loanForm)
      : this.secureService.saveLoan(this.loanForm);

    request.subscribe({
      next: () => {
        this.closeLoanModal();
        this.refresh();
      },
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

  private showError(err: HttpErrorResponse): void {
    this.errorMessage = err.error?.message || err.message || "Something went wrong.";
    if (err.status === 401) this.handleAuthError(err);
  }

  deleteLoan(loan: Loan): void {
    if (!loan._id) return;
    if (!confirm(`Delete this loan with ${loan.contactName}? This cannot be undone.`)) return;
    this.secureService.deleteLoan(loan._id).subscribe({
      next: () => this.refresh(),
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

  // ---------- contact picker (progressive enhancement) ----------
  async importFromDevice(): Promise<void> {
    if (!this.contactPickerSupported) return;
    try {
      const props = ["name", "tel", "email"];
      const selected = await (navigator as any).contacts.select(props, { multiple: false });
      if (selected && selected.length) {
        const c = selected[0];
        this.newContact.name = (c.name && c.name[0]) || "";
        this.newContact.phone = (c.tel && c.tel[0]) || "";
        this.newContact.email = (c.email && c.email[0]) || "";
        // WhatsApp is usually the same number; prefill as a convenience.
        this.newContact.whatsapp = this.newContact.phone;
      }
    } catch (err) {
      console.error("Contact picker cancelled or failed", err);
    }
  }

  // ---------- repayments ----------
  openRepaymentModal(loan: Loan): void {
    this.errorMessage = null;
    this.repaymentLoan = loan;
    this.newRepayment = { date: this.todayIso(), amount: this.remaining(loan), note: "" };
    this.showRepaymentModal = true;
  }

  closeRepaymentModal(): void {
    this.showRepaymentModal = false;
    this.repaymentLoan = null;
    this.errorMessage = null;
  }

  addRepayment(): void {
    if (!this.repaymentLoan?._id) return;
    if (!this.newRepayment.amount || this.newRepayment.amount <= 0) {
      this.errorMessage = "Repayment amount must be greater than 0.";
      return;
    }
    this.secureService.addRepayment(this.repaymentLoan._id, this.newRepayment).subscribe({
      next: (data: any) => {
        this.repaymentLoan = data.data; // updated loan with new remaining/status
        this.newRepayment = { date: this.todayIso(), amount: 0, note: "" };
        this.refresh();
      },
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }

  deleteRepayment(repaymentId: string | undefined): void {
    if (!this.repaymentLoan?._id || !repaymentId) return;
    this.secureService.deleteRepayment(this.repaymentLoan._id, repaymentId).subscribe({
      next: (data: any) => {
        this.repaymentLoan = data.data;
        this.refresh();
      },
      error: (err: HttpErrorResponse) => this.showError(err),
    });
  }
}
