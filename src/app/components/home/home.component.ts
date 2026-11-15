import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { DictionaryService } from 'src/app/services/DictionaryService';
import { LanguageService } from 'src/app/services/LanguageService';
import { Word } from 'src/app/models/word';
import { Post } from 'src/app/models/post';
import { PostService } from 'src/app/services/PostService';
import { ProjectService } from 'src/app/services/ProjectService';
import { AuthService } from 'src/app/services/AuthService';
import { Project } from 'src/app/models/project';
import { OWNER_NAME } from 'src/app/mappings/owner';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HomeComponent implements OnInit {
  /** Shown as is in every language. */
  readonly ownerName = OWNER_NAME;
  private readonly dictionary = inject(DictionaryService);
  readonly languageService = inject(LanguageService);

  private readonly postService = inject(PostService);
  private readonly projectService = inject(ProjectService);
  readonly auth = inject(AuthService);
  readonly projects = signal<Project[]>([]);
  readonly latestPosts = signal<Post[]>([]);
  /** Consecutive days (ending today or yesterday) with a published #challenge post. */
  readonly streak = signal(0);

  readonly dailyWord = signal<Word | null>(null);
  readonly dailyDate = signal<string>('');
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.projectService.listVisible().subscribe({ next: p => this.projects.set(p), error: () => {} });
    this.postService.list(undefined, 3).subscribe({ next: p => this.latestPosts.set(p), error: () => {} });
    this.postService.streak().subscribe({ next: r => this.streak.set(this.countStreak(r.days)), error: () => {} });
    this.dictionary.getDailyWord().subscribe({
      next: ({ date, word }) => {
        this.dailyWord.set(word);
        this.dailyDate.set(date);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Show the Uzbek meaning first for Uzbek visitors, English first otherwise. */
  get uzbekFirst(): boolean {
    return this.languageService.currentLang() === 'uz';
  }

  private countStreak(days: string[]): number {
    const set = new Set(days);
    const d = new Date();
    const key = () => d.toISOString().slice(0, 10);
    if (!set.has(key())) d.setUTCDate(d.getUTCDate() - 1); // today not posted yet doesn't break it
    let n = 0;
    while (set.has(key())) { n++; d.setUTCDate(d.getUTCDate() - 1); }
    return n;
  }

  speak(text: string): void {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  get canSpeak(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}
