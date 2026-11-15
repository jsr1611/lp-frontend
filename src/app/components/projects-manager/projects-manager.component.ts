import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { ProjectService } from 'src/app/services/ProjectService';
import { Project } from 'src/app/models/project';

type Filter = 'all' | 'visible' | 'hidden';

@Component({
  selector: 'app-projects-manager',
  templateUrl: './projects-manager.component.html',
  styleUrls: ['./projects-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ProjectsManagerComponent implements OnInit {
  private readonly api = inject(ProjectService);

  readonly projects = signal<Project[]>([]);
  readonly filter = signal<Filter>('all');
  readonly loading = signal(true);
  readonly importing = signal(false);
  readonly message = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  /** Project being edited or added; null = form closed. */
  editing: Project | null = null;
  techText = '';

  readonly visible = computed(() => this.projects().filter(p => p.visible));
  readonly shown = computed(() => {
    const f = this.filter();
    return this.projects().filter(p => f === 'all' || (f === 'visible') === p.visible);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listAll().subscribe({
      next: list => { this.projects.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.fail('Could not load projects.'); },
    });
  }

  importGithub(): void {
    this.importing.set(true);
    this.api.importGithub().subscribe({
      next: r => {
        this.importing.set(false);
        this.message.set({ type: 'success', text: `GitHub import: ${r.added} new (hidden until you show them), ${r.updated} refreshed.` });
        this.load();
      },
      error: err => { this.importing.set(false); this.fail(err?.error?.message || 'GitHub import failed.'); },
    });
  }

  toggle(p: Project): void {
    const visible = !p.visible;
    // Newly shown projects go to the end of the visible list
    const order = visible ? this.visible().length : p.order;
    this.api.update(p._id!, { visible, order }).subscribe({
      next: saved => this.replace(saved),
      error: () => this.fail('Could not update project.'),
    });
  }

  toggleCv(p: Project): void {
    const showOnCv = !p.showOnCv;
    const cvOrder = showOnCv ? this.projects().filter(x => x.showOnCv).length : p.cvOrder;
    this.api.update(p._id!, { showOnCv, cvOrder }).subscribe({
      next: saved => this.replace(saved),
      error: () => this.fail('Could not update project.'),
    });
  }

  /** Move a visible project up or down on the home page. */
  move(p: Project, dir: -1 | 1): void {
    const list = [...this.visible()].sort((a, b) => a.order - b.order);
    const i = list.findIndex(x => x._id === p._id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((x, k) => (x.order = k));
    this.projects.update(all => [...all]);
    this.api.reorder(list.map(x => x._id!)).subscribe({ error: () => this.fail('Could not save order.') });
  }

  sortedVisibleIndex(p: Project): number {
    return [...this.visible()].sort((a, b) => a.order - b.order).findIndex(x => x._id === p._id);
  }

  startAdd(): void {
    this.editing = { source: 'linkedin', title: '', description: '', url: '', demoUrl: '', tech: [], visible: true, order: this.visible().length };
    this.techText = '';
  }

  startEdit(p: Project): void {
    this.editing = { ...p };
    this.techText = p.tech.join(', ');
  }

  saveEdit(): void {
    const e = this.editing;
    if (!e || !e.title.trim()) return this.fail('Title is required.');
    const body = { ...e, tech: this.techText.split(',').map(s => s.trim()).filter(Boolean) };
    const req = e._id ? this.api.update(e._id, body) : this.api.create(body);
    req.subscribe({
      next: saved => {
        if (e._id) this.replace(saved); else this.projects.update(all => [saved, ...all]);
        this.editing = null;
      },
      error: () => this.fail('Could not save project.'),
    });
  }

  remove(p: Project): void {
    const note = p.source === 'github' ? ' It will come back (hidden) on the next GitHub import.' : '';
    if (!confirm(`Delete "${p.title}"?${note}`)) return;
    this.api.delete(p._id!).subscribe({
      next: () => this.projects.update(all => all.filter(x => x._id !== p._id)),
      error: () => this.fail('Could not delete project.'),
    });
  }

  private replace(saved: Project): void {
    this.projects.update(all => all.map(x => (x._id === saved._id ? saved : x)));
  }

  private fail(text: string): void {
    this.message.set({ type: 'danger', text });
  }
}
