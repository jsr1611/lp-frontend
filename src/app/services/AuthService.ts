import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { User } from "../models/user";
import { jwtDecode } from "jwt-decode";

@Injectable({
  providedIn: "root",
})
export class AuthService {

  private baseUrl = environment.baseUrl + "/api/auth";

  constructor(protected http: HttpClient) { }

  uploadPicture(fromData: FormData) {
    return this.http.post(this.baseUrl + "/profile/upload-picture", fromData);
  }

  getHeaders() {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/signin`, { username, password });
  }

  signup(user: User): Observable<any> {
    return this.http.post(`${this.baseUrl}/signup`, { user });
  }

  changeUserStatus(userId: string | undefined, newStatus: boolean | undefined) {
    return this.http.post(`${this.baseUrl}/update-status`, { userId, newStatus });
  }

  updateUserInfo(_id: string | undefined, user: User) {
    return this.http.put(`${this.baseUrl}/users/${_id}`, { "userInfo": user });
  }

  getUserProfile(all: string): Observable<any> {
    const params = new HttpParams().set('all', (all === 'all').toString());
    return this.http.get<any>(`${this.baseUrl}/profile`, {
      headers: this.getHeaders(),
      params: params,
    });
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  // Optionally, add a method to store and retrieve the JWT token
  setToken(token: string): void {
    localStorage.setItem("token", token);
  }

  getToken(): string | null {
    const token = localStorage.getItem("token");
    return token && !this.isTokenExpired(token) ? token : null;
  }

  isTokenExpired(token: string): boolean {
    if (!token) {
      console.log("No token was found");
      return true;
    }
    const decodedToken: any = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);

    if (decodedToken.exp < currentTime) {
      console.log("Token has already expired");
      localStorage.removeItem("token");
      return true;
    }
    return false;
  }

  logout(): void {
    try {
      localStorage.removeItem("token");
      console.log("logged out successfully");
    } catch (err) {
      console.error("Error logging out: ", err);
    }
  }
}
