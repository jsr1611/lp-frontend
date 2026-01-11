import { Injectable } from "@angular/core";
import { AuthService } from "./AuthService";
import { environment } from "src/environments/environment";
import { Expense } from "../models/expense";
import { HttpParams } from "@angular/common/http";

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
}
