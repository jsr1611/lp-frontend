import { Component, ChangeDetectionStrategy, OnInit, inject, signal, HostListener } from '@angular/core';
import { CvService } from 'src/app/services/CvService';
import { ProjectService } from 'src/app/services/ProjectService';
import { CvData, CvItem, CvLink } from 'src/app/models/cv';
import { Project } from 'src/app/models/project';
import { CV } from '../cv/cv-data';

/** Entry as edited in the form: bullet points as one text block, one point per line. */
interface EditEntry extends Omit<CvItem, 'points'> {
  pointsText: string;
}

type Section = 'experience' | 'education';

@Component({
  selector: 'app-cv-editor',
  templateUrl: './cv-editor.component.html',
  styleUrls: ['./cv-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CvEditorComponent implements OnInit {
  private readonly cvApi = inject(CvService);
  private readonly projectApi = inject(ProjectService);

  readonly icons = ['bi-github', 'bi-linkedin', 'bi-globe', 'bi-telegram', 'bi-envelope', 'bi-link-45deg'];
  readonly sections: Section[] = ['experience', 'education'];

  header = { name: '', headline: '', location: '', email: '', allProjectsUrl: '' };
  links: CvLink[] = [];
  entries: Record<Section, EditEntry[]> = { experience: [], education: [] };
  projects: Project[] = [];

  /** True until the CV is saved once; the first save also creates the built-in projects. */
  readonly firstSave = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly message = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  ngOnInit(): void {
    this.cvApi.get().subscribe({
      next: cv => { this.fill(cv); this.loading.set(false); },
      error: err => {
        if (err?.status === 404) {
          this.fill(CV);
          this.firstSave.set(true);
        } else {
          this.message.set({ type: 'danger', text: 'Could not load the CV.' });
        }
        this.loading.set(false);
      },
    });
    this.loadProjects();
  }

  private loadProjects(): void {
    this.projectApi.listAll().subscribe({
      next: list => (this.projects = list),
      error: () => {},
    });
  }

  private fill(cv: CvData): void {
    this.header = {
      name: cv.name, headline: cv.headline, location: cv.location,
      email: cv.email, allProjectsUrl: cv.allProjectsUrl || '',
    };
    this.links = cv.links.map(l => ({ ...l }));
    for (const s of this.sections) {
      this.entries[s] = cv[s].map(e => ({
        title: e.title, org: e.org, location: e.location || '', start: e.start, end: e.end || '',
        pointsText: e.points.join('\n'),
      }));
    }
  }

  changed(): void {
    this.dirty.set(true);
  }

  // ---- Links ----
  addLink(): void {
    this.links.push({ label: '', url: '', icon: 'bi-link-45deg' });
    this.changed();
  }
  removeLink(i: number): void {
    this.links.splice(i, 1);
    this.changed();
  }

  // ---- Experience / education ----
  addEntry(s: Section): void {
    this.entries[s].unshift({ title: '', org: '', location: '', start: '', end: '', pointsText: '' });
    this.changed();
  }
  removeEntry(s: Section, i: number): void {
    const e = this.entries[s][i];
    if ((e.title || e.org) && !confirm(`Remove "${e.title || e.org}"?`)) return;
    this.entries[s].splice(i, 1);
    this.changed();
  }
  moveEntry(s: Section, i: number, dir: -1 | 1): void {
    const list = this.entries[s];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.changed();
  }

  // ---- Projects (saved immediately, like on Manage projects) ----
  get cvProjects(): Project[] {
    return this.projects.filter(p => p.showOnCv).sort((a, b) => (a.cvOrder ?? 0) - (b.cvOrder ?? 0));
  }
  get otherProjects(): Project[] {
    return this.projects.filter(p => !p.showOnCv);
  }

  toggleCv(p: Project): void {
    const showOnCv = !p.showOnCv;
    const cvOrder = showOnCv ? this.cvProjects.length : p.cvOrder;
    this.projectApi.update(p._id!, { showOnCv, cvOrder }).subscribe({
      next: saved => this.replaceProject(saved),
      error: () => this.message.set({ type: 'danger', text: 'Could not update project.' }),
    });
  }

  saveProjectField(p: Project, field: 'period' | 'role'): void {
    this.projectApi.update(p._id!, { [field]: p[field] || '' }).subscribe({
      error: () => this.message.set({ type: 'danger', text: 'Could not save project.' }),
    });
  }

  moveProject(p: Project, dir: -1 | 1): void {
    const list = this.cvProjects;
    const i = list.findIndex(x => x._id === p._id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((x, k) => (x.cvOrder = k));
    this.projectApi.reorder(list.map(x => x._id!), 'cvOrder').subscribe({
      error: () => this.message.set({ type: 'danger', text: 'Could not save order.' }),
    });
  }

  private replaceProject(saved: Project): void {
    this.projects = this.projects.map(x => (x._id === saved._id ? saved : x));
  }

  // ---- Save ----
  @HostListener('document:keydown.control.s', ['$event'])
  @HostListener('document:keydown.meta.s', ['$event'])
  onSaveShortcut(e: Event): void {
    e.preventDefault();
    this.save();
  }

  @HostListener('window:beforeunload', ['$event'])
  onLeave(e: BeforeUnloadEvent): void {
    if (this.dirty()) e.preventDefault();
  }

  save(): void {
    const cv: CvData = {
      ...this.header,
      links: this.links.filter(l => l.url.trim()),
      experience: this.toItems(this.entries.experience),
      education: this.toItems(this.entries.education),
    };
    this.saving.set(true);
    this.cvApi.save(cv, this.firstSave() ? CV.projects : undefined).subscribe({
      next: ({ seeded }) => {
        this.saving.set(false);
        this.dirty.set(false);
        const extra = seeded ? ` ${seeded} projects added to your Projects list.` : '';
        this.message.set({ type: 'success', text: 'CV saved.' + extra });
        if (this.firstSave()) {
          this.firstSave.set(false);
          this.loadProjects();
        }
      },
      error: err => {
        this.saving.set(false);
        this.message.set({ type: 'danger', text: err?.error?.message || 'Save failed.' });
      },
    });
  }

  private toItems(list: EditEntry[]): CvItem[] {
    return list.map(({ pointsText, ...e }) => ({
      ...e,
      points: pointsText.split('\n').map(s => s.replace(/^\s*[-–•]\s*/, '').trim()).filter(Boolean),
    }));
  }
}
