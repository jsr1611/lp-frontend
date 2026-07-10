import { HttpErrorResponse } from "@angular/common/http";
import { Component, Inject, OnInit } from "@angular/core";
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

@Component({
  selector: "app-loan-tracker",
  templateUrl: "./loan-tracker.component.html",
  styleUrls: ["./loan-tracker.component.css"],
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
      next: (data: any) => (this.summary = data),
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
