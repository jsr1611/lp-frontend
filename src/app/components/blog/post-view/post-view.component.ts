import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PostService } from 'src/app/services/PostService';
import { AuthService } from 'src/app/services/AuthService';
import { Post } from 'src/app/models/post';

@Component({
  selector: 'app-post-view',
  templateUrl: './post-view.component.html',
  styleUrls: ['./post-view.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PostViewComponent implements OnInit {
  private readonly posts = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  readonly auth = inject(AuthService);

  readonly post = signal<Post | null>(null);
  readonly notFound = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug')!;
      this.post.set(null);
      this.notFound.set(false);
      this.posts.bySlug(slug).subscribe({
        next: p => {
          this.post.set(p);
          this.title.setTitle(p.title);
        },
        error: () => this.notFound.set(true),
      });
    });
  }
}
