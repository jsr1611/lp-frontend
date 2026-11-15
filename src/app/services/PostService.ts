import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Post, TagCount } from '../models/post';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.baseUrl + '/api/posts';

  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  // Public
  list(tag?: string, limit?: number) {
    let params = new HttpParams();
    if (tag) params = params.set('tag', tag);
    if (limit) params = params.set('limit', limit);
    return this.http.get<Post[]>(this.url, { params });
  }
  tags() {
    return this.http.get<TagCount[]>(this.url + '/tags');
  }
  streak(tag = 'challenge') {
    return this.http.get<{ days: string[] }>(this.url + '/streak', { params: { tag } });
  }
  bySlug(slug: string) {
    return this.http.get<Post>(`${this.url}/${encodeURIComponent(slug)}`);
  }

  // Owner
  listAll() {
    return this.http.get<Post[]>(this.url + '/manage/all', { headers: this.headers() });
  }
  byId(id: string) {
    return this.http.get<Post>(`${this.url}/manage/${id}`, { headers: this.headers() });
  }
  create(post: Post) {
    return this.http.post<Post>(this.url, post, { headers: this.headers() });
  }
  update(id: string, post: Post) {
    return this.http.put<Post>(`${this.url}/${id}`, post, { headers: this.headers() });
  }
  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`, { headers: this.headers() });
  }
}
