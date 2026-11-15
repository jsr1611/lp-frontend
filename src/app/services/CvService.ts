import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CvData, CvProject } from '../models/cv';
import { Project } from '../models/project';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.baseUrl + '/api/cv';

  get() {
    return this.http.get<CvData>(this.url);
  }
  projects() {
    return this.http.get<Project[]>(this.url + '/projects');
  }
  save(cv: CvData, seedProjects?: CvProject[]) {
    const headers = new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
    return this.http.put<{ cv: CvData; seeded: number }>(this.url, { ...cv, seedProjects }, { headers });
  }

  /** Convert a stored project into the CV's display shape. */
  static toCvProject(p: Project): CvProject {
    return { name: p.title, when: p.period || '', role: p.role, description: p.description, tech: p.tech, url: p.url || p.demoUrl };
  }
}
