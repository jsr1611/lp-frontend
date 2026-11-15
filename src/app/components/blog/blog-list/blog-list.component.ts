import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostService } from 'src/app/services/PostService';
import { AuthService } from 'src/app/services/AuthService';
import { Post, TagCount } from 'src/app/models/post';

@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class BlogListComponent implements OnInit {
  private readonly posts = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly items = signal<Post[]>([]);
  readonly tags = signal<TagCount[]>([]);
  readonly activeTag = signal<string>('');
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal(false);
  /** Owner can switch to "manage" to see drafts too. */
  readonly manage = signal(false);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter(p =>
      p.title.toLowerCase().includes(q) || (p.excerpt || '').toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.posts.tags().subscribe({ next: t => this.tags.set(t), error: () => {} });
    this.route.queryParamMap.subscribe(params => {
      this.activeTag.set(params.get('tag') || '');
      this.load();
    });
  }

  setTag(tag: string): void {
    this.router.navigate([], { queryParams: { tag: tag || null } });
  }

  toggleManage(): void {
    this.manage.update(v => !v);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    const req = this.manage() ? this.posts.listAll() : this.posts.list(this.activeTag() || undefined);
    req.subscribe({
      next: list => {
        const tag = this.activeTag();
        this.items.set(this.manage() && tag ? list.filter(p => p.tags.includes(tag)) : list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
