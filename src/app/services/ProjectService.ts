import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Project } from '../models/project';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.baseUrl + '/api/projects';

  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  listVisible() {
    return this.http.get<Project[]>(this.url);
  }
  listAll() {
    return this.http.get<Project[]>(this.url + '/manage/all', { headers: this.headers() });
  }
  importGithub() {
    return this.http.post<{ added: number; updated: number; skippedForks: number }>(
      this.url + '/import-github', {}, { headers: this.headers() });
  }
  create(p: Partial<Project>) {
    return this.http.post<Project>(this.url, p, { headers: this.headers() });
  }
  update(id: string, p: Partial<Project>) {
    return this.http.put<Project>(`${this.url}/${id}`, p, { headers: this.headers() });
  }
  reorder(ids: string[], field: 'order' | 'cvOrder' = 'order') {
    return this.http.post(this.url + '/reorder', { ids, field }, { headers: this.headers() });
  }
  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`, { headers: this.headers() });
  }
}
