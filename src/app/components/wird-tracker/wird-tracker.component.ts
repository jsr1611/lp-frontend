import { HttpErrorResponse } from "@angular/common/http";
import { Component, Inject, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { SecureService } from "src/app/services/SercureService";
import { Wird, WirdList, WirdListStatus, WirdListSummary, WirdProgress } from "src/app/models/wird";

// Starting points for a new list. Names and labels are translated once, at creation,
// and stored as plain text, so the user can rename them freely afterwards.
interface ListPreset {
  key: string;
  icon: string;
  labelKeys: string[];
  keepByDefault: boolean;
}

const PRESETS: ListPreset[] = [
  {
    key: "qada",
    icon: "🕌",
    labelKeys: ["fajr", "dhuhr", "asr", "maghrib", "isha", "witr"].map((p) => `wirds.presets.prayers.${p}`),
    keepByDefault: false,
  },
  { key: "wirds", icon: "📿", labelKeys: [], keepByDefault: false },
  { key: "borrowed", icon: "🤝", labelKeys: [], keepByDefault: true },
  { key: "notes", icon: "📝", labelKeys: [], keepByDefault: false },
  { key: "blank", icon: "📋", labelKeys: [], keepByDefault: false },
];

const EMPTY_SUMMARY: WirdListSummary = { listId: "", open: 0, overdue: 0, remaining: {}, done: {} };

@Component({
    selector: "app-wird-tracker",
    templateUrl: "./wird-tracker.component.html",
    styleUrls: ["./wird-tracker.component.css"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class WirdTrackerComponent implements OnInit {
  presets = PRESETS;

  // Data
  lists: WirdList[] = [];
  wirds: Wird[] = [];
  private summaries: { [listId: string]: WirdListSummary } = {};
  private listMap: { [id: string]: WirdList } = {};
  // Lists whose label tiles are on screen: the selected one, or every labelled list on "All".
  tileLists: WirdList[] = [];

  selectedListId = ""; // '' = all lists
  view: WirdListStatus = "open";

  // Entry add/edit modal
  showModal = false;
  isEditing = false;
  isSaving = false; // in-flight guard against double-submit
  form: Wird = { count: 1 };

  // List add/edit modal
  showListModal = false;
  listForm: WirdList = { name: "", labels: [] };
  labelsText = "";
  presetKey = "blank";

  // Progress modal: one entry, or one label of a list (oldest first).
  showProgressModal = false;
  progressItem: Wird | null = null;
  progressList: WirdList | null = null;
  progressLabel: string | null = null;
  newProgress: WirdProgress = { date: this.todayIso(), count: 1, note: "" };

  busy = false; // quick tile buttons
  errorMessage: string | null = null;

  constructor(
    @Inject(Router) private router: Router,
    private secureService: SecureService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadLists();
    this.refresh();
  }

  // ---------- helpers ----------
  // Local calendar day, so "today" flips at the user's midnight.
  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }

  private nowTime(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  private toIsoDate(value: string | undefined): string {
    return value ? value.slice(0, 10) : "";
  }

  private handleError(err: HttpErrorResponse): void {
    this.errorMessage = err.error?.message || err.message || this.translate.instant("wirds.errors.generic");
    if (err.status === 401) {
      localStorage.removeItem("token");
      this.router.navigate(["/login"]);
    }
  }

  get selectedList(): WirdList | undefined {
    return this.listMap[this.selectedListId];
  }

  listById(id: string | undefined): WirdList | undefined {
    return id ? this.listMap[id] : undefined;
  }

  summaryFor(listId: string | undefined): WirdListSummary {
    return this.summaries[listId || "none"] || EMPTY_SUMMARY;
  }

  remaining(w: Wird): number {
    return w.remaining ?? Math.max(0, w.count - (w.doneCount || 0));
  }

  percentDone(w: Wird): number {
    return w.count ? Math.round(((w.doneCount || 0) / w.count) * 100) : 0;
  }

  isOverdue(w: Wird): boolean {
    return w.status === "open" && !!w.dueDate && this.toIsoDate(w.dueDate) < this.todayIso();
  }

  private updateTileLists(): void {
    const sel = this.selectedList;
    this.tileLists = sel
      ? sel.labels.length ? [sel] : []
      : this.selectedListId ? [] : this.lists.filter((l) => l.labels.length);
  }

  // ---------- loaders ----------
  loadLists(): void {
    this.secureService.getWirdLists().subscribe({
      next: (data: any) => {
        this.lists = data.lists || [];
        this.listMap = {};
        this.lists.forEach((l) => (this.listMap[l._id!] = l));
        if (this.selectedListId && this.selectedListId !== "none" && !this.listMap[this.selectedListId]) {
          this.selectedListId = "";
        }
        this.updateTileLists();
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  loadWirds(): void {
    this.secureService.getWirds(this.view, this.selectedListId || undefined).subscribe({
      next: (data: any) => (this.wirds = data.wirds || []),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  loadSummary(): void {
    this.secureService.getWirdSummary().subscribe({
      next: (data: any) => {
        this.summaries = {};
        (data.lists || []).forEach((s: WirdListSummary) => (this.summaries[s.listId] = s));
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  private refresh(): void {
    this.loadWirds();
    this.loadSummary();
  }

  selectList(listId: string): void {
    this.selectedListId = listId;
    this.updateTileLists();
    this.loadWirds();
  }

  setView(view: WirdListStatus): void {
    this.view = view;
    this.loadWirds();
  }

  // ---------- label tiles ----------
  // "+": one more owed under this label, dated now. Details can be edited afterwards.
  quickAdd(list: WirdList, label: string): void {
    if (this.busy) return;
    this.busy = true;
    const wird: Wird = {
      listId: list._id,
      label,
      count: 1,
      date: this.todayIso(),
      time: this.nowTime(),
      keep: !!list.keepByDefault,
    };
    this.secureService.saveWird(wird).subscribe({
      next: () => {
        this.busy = false;
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.busy = false;
        this.handleError(err);
      },
    });
  }

  // "✓": one done today, against the oldest open entry with this label.
  quickDone(list: WirdList, label: string): void {
    if (this.busy || !this.summaryFor(list._id).remaining[label]) return;
    this.busy = true;
    this.secureService.catchUpWirds(list._id, label, { date: this.todayIso(), count: 1 }).subscribe({
      next: () => {
        this.busy = false;
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.busy = false;
        this.handleError(err);
      },
    });
  }

  // ---------- entry modal ----------
  openModal(wird?: Wird, list?: WirdList, label?: string): void {
    this.errorMessage = null;
    if (wird) {
      this.isEditing = true;
      this.form = { ...wird, date: this.toIsoDate(wird.date), dueDate: this.toIsoDate(wird.dueDate) };
    } else {
      this.isEditing = false;
      const target = list || this.selectedList;
      this.form = {
        listId: target?._id || "",
        label: label || "",
        title: "",
        date: this.todayIso(),
        time: "",
        count: 1,
        dueDate: "",
        note: "",
        keep: !!target?.keepByDefault,
      };
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isSaving = false;
    this.errorMessage = null;
  }

  // Labels offered in the entry form: the chosen list's, plus the entry's own if it was removed.
  get formLabels(): string[] {
    const labels = this.listById(this.form.listId)?.labels || [];
    return this.form.label && !labels.includes(this.form.label) ? [...labels, this.form.label] : labels;
  }

  onFormListChange(listId: string): void {
    const list = this.listById(listId);
    if (!list?.labels.includes(this.form.label || "")) this.form.label = "";
    if (!this.isEditing) this.form.keep = !!list?.keepByDefault;
  }

  save(): void {
    if (this.isSaving) return;
    this.errorMessage = null;
    if (!this.form.title?.trim() && !this.form.label) {
      this.errorMessage = this.translate.instant("wirds.errors.titleRequired");
      return;
    }
    if (!Number.isInteger(Number(this.form.count)) || this.form.count < 1) {
      this.errorMessage = this.translate.instant("wirds.errors.countPositive");
      return;
    }
    this.isSaving = true;
    const request = this.isEditing
      ? this.secureService.updateWird(this.form)
      : this.secureService.saveWird(this.form);
    request.subscribe({
      next: () => {
        this.closeModal();
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.handleError(err);
      },
    });
  }

  // ---------- list modal ----------
  openListModal(list?: WirdList): void {
    this.errorMessage = null;
    if (list) {
      this.listForm = { ...list, labels: [...list.labels] };
      this.presetKey = "";
    } else {
      this.listForm = { name: "", labels: [] };
      this.applyPreset("blank");
    }
    this.labelsText = this.listForm.labels.join(", ");
    this.showListModal = true;
  }

  closeListModal(): void {
    this.showListModal = false;
    this.isSaving = false;
    this.errorMessage = null;
  }

  applyPreset(key: string): void {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    this.presetKey = key;
    this.listForm.name = key === "blank" ? "" : this.translate.instant(`wirds.presets.${key}.name`);
    this.listForm.icon = preset.icon;
    this.listForm.keepByDefault = preset.keepByDefault;
    this.labelsText = preset.labelKeys.map((k) => this.translate.instant(k)).join(", ");
  }

  saveList(): void {
    if (this.isSaving) return;
    this.errorMessage = null;
    if (!this.listForm.name?.trim()) {
      this.errorMessage = this.translate.instant("wirds.errors.nameRequired");
      return;
    }
    this.listForm.labels = this.labelsText.split(",").map((l) => l.trim()).filter(Boolean);
    this.isSaving = true;
    const request = this.listForm._id
      ? this.secureService.updateWirdList(this.listForm)
      : this.secureService.saveWirdList(this.listForm);
    request.subscribe({
      next: (data: any) => {
        this.closeListModal();
        if (data.data?._id) this.selectedListId = data.data._id;
        this.loadLists();
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.handleError(err);
      },
    });
  }

  deleteList(list: WirdList): void {
    if (!list._id || !confirm(this.translate.instant("wirds.deleteListConfirm", { name: list.name }))) return;
    this.secureService.deleteWirdList(list._id).subscribe({
      next: () => {
        this.closeListModal();
        this.selectedListId = "";
        this.loadLists();
        this.refresh();
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  // ---------- progress ----------
  openProgressModal(wird: Wird | null, list: WirdList | null = null, label: string | null = null): void {
    this.errorMessage = null;
    this.progressItem = wird;
    this.progressList = list;
    this.progressLabel = label;
    this.newProgress = { date: this.todayIso(), count: 1, note: "" };
    this.showProgressModal = true;
  }

  closeProgressModal(): void {
    this.showProgressModal = false;
    this.progressItem = null;
    this.progressList = null;
    this.progressLabel = null;
    this.errorMessage = null;
  }

  get progressMax(): number {
    if (this.progressItem) return this.remaining(this.progressItem);
    return this.progressLabel ? this.summaryFor(this.progressList?._id).remaining[this.progressLabel] || 0 : 0;
  }

  addProgress(): void {
    const count = Number(this.newProgress.count);
    if (!Number.isInteger(count) || count < 1) {
      this.errorMessage = this.translate.instant("wirds.errors.countPositive");
      return;
    }
    const request = this.progressItem?._id
      ? this.secureService.addWirdProgress(this.progressItem._id, this.newProgress)
      : this.secureService.catchUpWirds(this.progressList?._id, this.progressLabel!, this.newProgress);
    request.subscribe({
      next: (data: any) => {
        // Stay open on a single entry so its log is visible; close for a whole label.
        if (this.progressItem && data.data?.status === "open") {
          this.progressItem = data.data;
          this.newProgress = { date: this.todayIso(), count: 1, note: "" };
        } else {
          this.closeProgressModal();
        }
        this.refresh();
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  deleteProgress(progressId: string | undefined): void {
    if (!this.progressItem?._id || !progressId) return;
    this.secureService.deleteWirdProgress(this.progressItem._id, progressId).subscribe({
      next: (data: any) => {
        this.progressItem = data.data;
        this.refresh();
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  // ---------- status ----------
  markDone(wird: Wird): void {
    if (!wird._id) return;
    this.secureService.setWirdStatus(wird._id, "done").subscribe({
      next: () => this.refresh(),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  reopen(wird: Wird): void {
    if (!wird._id) return;
    if ((wird.doneCount || 0) > 0 && wird.count > 1 && !confirm(this.translate.instant("wirds.reopenConfirm"))) return;
    this.secureService.setWirdStatus(wird._id, "open").subscribe({
      next: () => this.refresh(),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  toggleKeep(wird: Wird): void {
    if (!wird._id) return;
    this.secureService.setWirdStatus(wird._id, wird.status || "open", !wird.keep).subscribe({
      next: () => this.refresh(),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  delete(wird: Wird): void {
    if (!wird._id || !confirm(this.translate.instant("wirds.deleteConfirm"))) return;
    this.secureService.deleteWird(wird._id).subscribe({
      next: () => this.refresh(),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  clearCompleted(): void {
    if (!confirm(this.translate.instant("wirds.clearConfirm"))) return;
    this.secureService.clearCompletedWirds(this.selectedListId || undefined).subscribe({
      next: () => this.refresh(),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }
}
