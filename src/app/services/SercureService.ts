import { Injectable } from "@angular/core";
import { AuthService } from "./AuthService";
import { environment } from "src/environments/environment";
import { Expense } from "../models/expense";
import { HttpParams } from "@angular/common/http";
import { Contact } from "../models/contact";
import { Loan, LoanFilters, Repayment } from "../models/loan";
import { OvertimeEntry, OvertimeSettings } from "../models/overtime";

@Injectable({
  providedIn: "root",
})
export class SecureService extends AuthService {

  private url = environment.baseUrl + "/api";
  private downloadUrl = environment.baseUrl_download + "/download";
  getVisits(weeks: number | null) {
    return this.http.get(this.url + `/visits/data/${weeks}`, {
      headers: this.getHeaders(),
    });
  }
  saveExpense(todaysExpense: Expense) {
    return this.http.post(this.url + `/expenses`, {
      headers: this.getHeaders(),
      todaysExpense
    });
  }

  getExpense(monthYear: string, all: string) {
    let params = new HttpParams().set('all', (all === 'all').toString());
    const monthYearArr = (monthYear != undefined && monthYear.length > 5) ? monthYear?.split(',') : [];
    if (monthYearArr?.length === 2) {
      params = params.set('month', monthYearArr[0].toString());
      params = params.set('year', monthYearArr[1].toString());
    }
    return this.http.get(this.url + `/expenses`, {
      headers: this.getHeaders(),
      params: params,
    });
  }

  deleteExpense(id: string) {
    return this.http.delete(this.url + `/expenses/${id}`, {
      headers: this.getHeaders(),
    });
  }
  updatedExpense(expense: Expense) {
    return this.http.put(this.url + `/expenses/${expense._id}`, {
      headers: this.getHeaders(),
      expense
    });
  }

  download(payload: any) {
    return this.http.post(this.downloadUrl, payload, { observe: 'response', responseType: 'blob' });
  }

  // ---------- Contacts ----------
  getContacts(search?: string) {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get(this.url + `/contacts`, {
      headers: this.getHeaders(),
      params,
    });
  }

  saveContact(contact: Contact) {
    return this.http.post(this.url + `/contacts`, { contact }, {
      headers: this.getHeaders(),
    });
  }

  updateContact(contact: Contact) {
    return this.http.put(this.url + `/contacts/${contact._id}`, { contact }, {
      headers: this.getHeaders(),
    });
  }

  deleteContact(id: string) {
    return this.http.delete(this.url + `/contacts/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // ---------- Loans ----------
  getLoans(filters: LoanFilters = {}) {
    let params = new HttpParams();
    if (filters.direction) params = params.set('direction', filters.direction);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.contactId) params = params.set('contactId', filters.contactId);
    return this.http.get(this.url + `/loans`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getLoanSummary() {
    return this.http.get(this.url + `/loans/summary`, {
      headers: this.getHeaders(),
    });
  }

  saveLoan(loan: Loan) {
    return this.http.post(this.url + `/loans`, { loan }, {
      headers: this.getHeaders(),
    });
  }

  updateLoan(loan: Loan) {
    return this.http.put(this.url + `/loans/${loan._id}`, { loan }, {
      headers: this.getHeaders(),
    });
  }

  deleteLoan(id: string) {
    return this.http.delete(this.url + `/loans/${id}`, {
      headers: this.getHeaders(),
    });
  }

  addRepayment(loanId: string, repayment: Repayment) {
    return this.http.post(this.url + `/loans/${loanId}/repayments`, { repayment }, {
      headers: this.getHeaders(),
    });
  }

  deleteRepayment(loanId: string, repaymentId: string) {
    return this.http.delete(this.url + `/loans/${loanId}/repayments/${repaymentId}`, {
      headers: this.getHeaders(),
    });
  }

  // ---------- Overtime ----------

  // Resolves with { settings: null } when the user has never run setup.
  getOvertimeSettings() {
    return this.http.get(this.url + `/overtime/settings`, {
      headers: this.getHeaders(),
    });
  }

  // Upsert — the first save doubles as creation.
  saveOvertimeSettings(settings: OvertimeSettings) {
    return this.http.put(this.url + `/overtime/settings`, { settings }, {
      headers: this.getHeaders(),
    });
  }

  // month is "YYYY-MM"; omitted means the current month.
  getOvertimeEntries(month?: string) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get(this.url + `/overtime/entries`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getOvertimeSummary(month?: string) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get(this.url + `/overtime/summary`, {
      headers: this.getHeaders(),
      params,
    });
  }

  saveOvertimeEntry(entry: OvertimeEntry) {
    return this.http.post(this.url + `/overtime/entries`, { entry }, {
      headers: this.getHeaders(),
    });
  }

  // resnapshot re-applies the current settings to an entry logged under older ones.
  updateOvertimeEntry(entry: OvertimeEntry, resnapshot = false) {
    return this.http.put(this.url + `/overtime/entries/${entry._id}`, { entry, resnapshot }, {
      headers: this.getHeaders(),
    });
  }

  deleteOvertimeEntry(id: string) {
    return this.http.delete(this.url + `/overtime/entries/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
