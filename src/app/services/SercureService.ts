import { Injectable } from "@angular/core";
import { AuthService } from "./AuthService";
import { environment } from "src/environments/environment";
import { Expense } from "../models/expense";
import { HttpParams } from "@angular/common/http";
import { Contact } from "../models/contact";
import { Loan, LoanFilters, Repayment } from "../models/loan";
import { Wird, WirdList, WirdListStatus, WirdProgress, WirdStatus } from "../models/wird";
import { LeaveDay, OvertimeEntry, OvertimeSettings, Payslip } from "../models/overtime";
import { GigJob, GigPayment, GigShift } from "../models/gig";

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

  getExpense(monthYear: string, all: string, currency?: string) {
    let params = new HttpParams().set('all', (all === 'all').toString());
    if (currency) {
      params = params.set('currency', currency);
    }
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

  // ---------- Wirds (lists of notes, tasks, things owed) ----------
  getWirdLists() {
    return this.http.get(this.url + `/wirds/lists`, {
      headers: this.getHeaders(),
    });
  }

  saveWirdList(list: WirdList) {
    return this.http.post(this.url + `/wirds/lists`, { list }, {
      headers: this.getHeaders(),
    });
  }

  updateWirdList(list: WirdList) {
    return this.http.put(this.url + `/wirds/lists/${list._id}`, { list }, {
      headers: this.getHeaders(),
    });
  }

  mergeWirdList(id: string, intoId: string) {
    return this.http.post(this.url + `/wirds/lists/${id}/merge`, { intoId }, {
      headers: this.getHeaders(),
    });
  }

  deleteWirdList(id: string) {
    return this.http.delete(this.url + `/wirds/lists/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // listId: a list id, 'none' for entries outside any list, or omitted for all.
  getWirds(status: WirdListStatus = 'open', listId?: string) {
    let params = new HttpParams().set('status', status);
    if (listId) params = params.set('listId', listId);
    return this.http.get(this.url + `/wirds`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getWirdSummary() {
    return this.http.get(this.url + `/wirds/summary`, {
      headers: this.getHeaders(),
    });
  }

  saveWird(wird: Wird) {
    return this.http.post(this.url + `/wirds`, { wird }, {
      headers: this.getHeaders(),
    });
  }

  updateWird(wird: Wird) {
    return this.http.put(this.url + `/wirds/${wird._id}`, { wird }, {
      headers: this.getHeaders(),
    });
  }

  deleteWird(id: string) {
    return this.http.delete(this.url + `/wirds/${id}`, {
      headers: this.getHeaders(),
    });
  }

  setWirdStatus(id: string, status: WirdStatus, keep?: boolean) {
    return this.http.post(this.url + `/wirds/${id}/status`, { status, keep }, {
      headers: this.getHeaders(),
    });
  }

  addWirdProgress(id: string, progress: WirdProgress) {
    return this.http.post(this.url + `/wirds/${id}/progress`, { progress }, {
      headers: this.getHeaders(),
    });
  }

  deleteWirdProgress(id: string, progressId: string) {
    return this.http.delete(this.url + `/wirds/${id}/progress/${progressId}`, {
      headers: this.getHeaders(),
    });
  }

  // Progress against one label of a list, oldest entries first (e.g. make up 3 Fajr).
  catchUpWirds(listId: string | undefined, label: string, progress: WirdProgress) {
    return this.http.post(this.url + `/wirds/catch-up`, { listId, label, progress }, {
      headers: this.getHeaders(),
    });
  }

  clearCompletedWirds(listId?: string) {
    let params = new HttpParams();
    if (listId) params = params.set('listId', listId);
    return this.http.delete(this.url + `/wirds/completed`, {
      headers: this.getHeaders(),
      params,
    });
  }

  // ---------- Overtime ----------

  // The job every overtime call below works on, sent as X-Job-Id. Set by the tracker
  // from its route; null while setting up a new job.
  overtimeJobId: string | null = null;

  private jobHeaders() {
    const headers = this.getHeaders();
    return this.overtimeJobId ? headers.set('X-Job-Id', this.overtimeJobId) : headers;
  }

  getOvertimeJobs() {
    return this.http.get(this.url + `/overtime/jobs`, { headers: this.getHeaders() });
  }

  // Removes the job and every day, day off and payslip logged under it.
  deleteOvertimeJob(id: string) {
    return this.http.delete(this.url + `/overtime/jobs/${id}`, { headers: this.getHeaders() });
  }

  // Resolves with { settings: null } when no job is selected (setting up a new one).
  getOvertimeSettings() {
    return this.http.get(this.url + `/overtime/settings`, {
      headers: this.jobHeaders(),
    });
  }

  // Upsert — the first save doubles as creation.
  saveOvertimeSettings(settings: OvertimeSettings) {
    return this.http.put(this.url + `/overtime/settings`, { settings }, {
      headers: this.jobHeaders(),
    });
  }

  // month is "YYYY-MM"; omitted means the current month.
  getOvertimeEntries(month?: string) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get(this.url + `/overtime/entries`, {
      headers: this.jobHeaders(),
      params,
    });
  }

  getOvertimeSummary(month?: string) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get(this.url + `/overtime/summary`, {
      headers: this.jobHeaders(),
      params,
    });
  }

  // Korean public holidays for a month. Check `available` before trusting `holidays` —
  // an empty list from a failed lookup is not the same as a month with no holidays.
  getOvertimeHolidays(month: string) {
    let params = new HttpParams().set('month', month);
    return this.http.get(this.url + `/overtime/holidays`, {
      headers: this.jobHeaders(),
      params,
    });
  }

  saveOvertimeEntry(entry: OvertimeEntry) {
    return this.http.post(this.url + `/overtime/entries`, { entry }, {
      headers: this.jobHeaders(),
    });
  }

  // resnapshot re-applies the current settings to an entry logged under older ones.
  updateOvertimeEntry(entry: OvertimeEntry, resnapshot = false) {
    return this.http.put(this.url + `/overtime/entries/${entry._id}`, { entry, resnapshot }, {
      headers: this.jobHeaders(),
    });
  }

  deleteOvertimeEntry(id: string) {
    return this.http.delete(this.url + `/overtime/entries/${id}`, {
      headers: this.jobHeaders(),
    });
  }

  // Tenure, leave balance and milestones. `today` is the viewer's local "YYYY-MM-DD",
  // so day counts flip at their midnight rather than the server's.
  getOvertimeOverview(today: string) {
    return this.http.get(this.url + `/overtime/overview`, {
      headers: this.jobHeaders(),
      params: new HttpParams().set('today', today),
    });
  }

  markMilestonesSeen(ids: string[]) {
    return this.http.post(this.url + `/overtime/milestones/seen`, { ids }, {
      headers: this.jobHeaders(),
    });
  }

  getLeaveDays(month: string) {
    return this.http.get(this.url + `/overtime/leave`, {
      headers: this.jobHeaders(),
      params: new HttpParams().set('month', month),
    });
  }

  saveLeaveDay(leave: LeaveDay) {
    return leave._id
      ? this.http.put(this.url + `/overtime/leave/${leave._id}`, { leave }, { headers: this.jobHeaders() })
      : this.http.post(this.url + `/overtime/leave`, { leave }, { headers: this.jobHeaders() });
  }

  deleteLeaveDay(id: string) {
    return this.http.delete(this.url + `/overtime/leave/${id}`, {
      headers: this.jobHeaders(),
    });
  }

  // Create or replace the payslip for the month the overtime was worked.
  savePayslip(payslip: Payslip) {
    return this.http.put(this.url + `/overtime/payslip`, { payslip }, {
      headers: this.jobHeaders(),
    });
  }

  deletePayslip(month: string) {
    return this.http.delete(this.url + `/overtime/payslip/${month}`, {
      headers: this.jobHeaders(),
    });
  }

  // ---------- Gigs (part-time work for several agencies) ----------

  createGigJob(job: GigJob) {
    return this.http.post(this.url + `/gigs`, { job }, { headers: this.getHeaders() });
  }

  // Resolves with { job, minimumWage }.
  getGigJob(jobId: string) {
    return this.http.get(this.url + `/gigs/${jobId}`, { headers: this.getHeaders() });
  }

  saveGigJob(jobId: string, job: GigJob) {
    return this.http.put(this.url + `/gigs/${jobId}`, { job }, { headers: this.getHeaders() });
  }

  getGigShifts(jobId: string, month: string) {
    return this.http.get(this.url + `/gigs/${jobId}/shifts`, {
      headers: this.getHeaders(),
      params: new HttpParams().set('month', month),
    });
  }

  saveGigShift(jobId: string, shift: GigShift) {
    return shift._id
      ? this.http.put(this.url + `/gigs/${jobId}/shifts/${shift._id}`, { shift }, { headers: this.getHeaders() })
      : this.http.post(this.url + `/gigs/${jobId}/shifts`, { shift }, { headers: this.getHeaders() });
  }

  // Every unpaid shift for one agency, across months.
  getUnpaidGigShifts(jobId: string, agencyId: string) {
    return this.http.get(this.url + `/gigs/${jobId}/shifts`, {
      headers: this.getHeaders(),
      params: new HttpParams().set('unpaid', '1').set('agencyId', agencyId),
    });
  }

  deleteGigShift(jobId: string, id: string) {
    return this.http.delete(this.url + `/gigs/${jobId}/shifts/${id}`, { headers: this.getHeaders() });
  }

  // `today` is the viewer's local "YYYY-MM-DD", so "overdue" flips at their midnight.
  getGigPending(jobId: string, today: string) {
    return this.http.get(this.url + `/gigs/${jobId}/pending`, {
      headers: this.getHeaders(),
      params: new HttpParams().set('today', today),
    });
  }

  getGigPayments(jobId: string) {
    return this.http.get(this.url + `/gigs/${jobId}/payments`, { headers: this.getHeaders() });
  }

  recordGigPayment(jobId: string, payment: GigPayment) {
    return this.http.post(this.url + `/gigs/${jobId}/payments`, { payment }, { headers: this.getHeaders() });
  }

  // Undo a payment; its shifts become pending again.
  deleteGigPayment(jobId: string, id: string) {
    return this.http.delete(this.url + `/gigs/${jobId}/payments/${id}`, { headers: this.getHeaders() });
  }
}
