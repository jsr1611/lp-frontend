import { Component, ChangeDetectionStrategy, OnInit, inject, signal, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PostService } from 'src/app/services/PostService';
import { Post } from 'src/app/models/post';

const CHALLENGE_TEMPLATE = `## Problem

Short description of the problem, or a link to it.

## Approach

How I thought about it.

## Solution

\`\`\`js
function solve(input) {
  // ...
}
\`\`\`

## Complexity

- Time: O(n)
- Space: O(1)

## What I learned

-
`;

@Component({
  selector: 'app-post-editor',
  templateUrl: './post-editor.component.html',
  styleUrls: ['./post-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PostEditorComponent implements OnInit {
  private readonly posts = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id: string | null = null;
  post: Post = this.blank();
  tagsText = '';
  /** On phones only one pane is shown at a time. */
  readonly tab = signal<'write' | 'preview'>('write');
  readonly saving = signal(false);
  readonly message = signal<{ type: 'success' | 'danger'; text: string } | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.loading.set(true);
      this.posts.byId(this.id).subscribe({
        next: p => {
          this.post = { ...p, challenge: { ...this.blank().challenge, ...(p.challenge || {}) } };
          this.tagsText = p.tags.join(', ');
          this.loading.set(false);
        },
        error: () => {
          this.message.set({ type: 'danger', text: 'Could not load the post.' });
          this.loading.set(false);
        },
      });
    }
  }

  get isChallenge(): boolean {
    return this.parseTags().includes('challenge');
  }

  /** Start a daily challenge post: tag, title with today's date and the template. */
  useChallengeTemplate(): void {
    const tags = this.parseTags();
    if (!tags.includes('challenge')) tags.unshift('challenge');
    this.tagsText = tags.join(', ');
    if (!this.post.title) {
      this.post.title = `Daily challenge · ${new DatePipe('en-US').transform(new Date(), 'MMM d, y')}`;
    }
    if (!this.post.content?.trim()) this.post.content = CHALLENGE_TEMPLATE;
  }

  @HostListener('document:keydown.control.s', ['$event'])
  @HostListener('document:keydown.meta.s', ['$event'])
  onSaveShortcut(e: Event): void {
    e.preventDefault();
    this.save();
  }

  save(publish?: boolean): void {
    if (!this.post.title?.trim() || !this.post.content?.trim()) {
      this.message.set({ type: 'danger', text: 'Title and content are required.' });
      return;
    }
    const body: Post = { ...this.post, tags: this.parseTags() };
    if (publish !== undefined) body.published = publish;
    if (!this.isChallenge) delete body.challenge;

    this.saving.set(true);
    const req = this.id ? this.posts.update(this.id, body) : this.posts.create(body);
    req.subscribe({
      next: saved => {
        this.saving.set(false);
        this.post = { ...saved, challenge: { ...this.blank().challenge, ...(saved.challenge || {}) } };
        this.message.set({ type: 'success', text: saved.published ? 'Saved and published.' : 'Draft saved.' });
        if (!this.id) {
          this.id = saved._id!;
          this.router.navigate(['/blog/edit', saved._id], { replaceUrl: true });
        }
      },
      error: err => {
        this.saving.set(false);
        this.message.set({ type: 'danger', text: err?.error?.message || 'Save failed.' });
      },
    });
  }

  remove(): void {
    if (!this.id || !confirm('Delete this post permanently?')) return;
    this.posts.delete(this.id).subscribe({
      next: () => this.router.navigate(['/blog']),
      error: () => this.message.set({ type: 'danger', text: 'Delete failed.' }),
    });
  }

  private parseTags(): string[] {
    return [...new Set(this.tagsText.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))];
  }

  private blank(): Post {
    return {
      title: '',
      content: '',
      excerpt: '',
      tags: [],
      published: false,
      challenge: { source: '', url: '', difficulty: '', language: '' },
    };
  }
}
