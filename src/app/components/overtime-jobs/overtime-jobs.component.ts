import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { SecureService } from "src/app/services/SercureService";
import { OvertimeJob } from "src/app/models/overtime";

/**
 * The root of the work-hours section: every job the user tracks, each opening its own
 * tracker at /overtime/:jobId. Current jobs come first, ended contracts after.
 */
@Component({
  selector: "app-overtime-jobs",
  templateUrl: "./overtime-jobs.component.html",
  styleUrls: ["./overtime-jobs.component.css"],
  standalone: false,
})
export class OvertimeJobsComponent implements OnInit {
  private readonly secureService = inject(SecureService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  jobs: OvertimeJob[] = [];
  loaded = false;
  errorMessage: string | null = null;
  deletingId: string | null = null;

  get activeJobs(): OvertimeJob[] {
    return this.jobs.filter((j) => j.active);
  }

  get pastJobs(): OvertimeJob[] {
    return this.jobs.filter((j) => !j.active);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.errorMessage = null;
    this.secureService.getOvertimeJobs().subscribe({
      next: (data: any) => {
        this.jobs = data.jobs || [];
        this.loaded = true;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.fail(err),
    });
  }

  open(job: OvertimeJob): void {
    this.router.navigate(["/overtime", job._id]);
  }

  addJob(): void {
    this.router.navigate(["/overtime", "new"]);
  }

  remove(job: OvertimeJob, event: Event): void {
    event.stopPropagation();
    const name = job.company?.name || this.translate.instant("overtime.jobs.untitled");
    const question = this.translate.instant("overtime.jobs.confirmDelete", { name, days: job.daysLogged });
    if (!confirm(question)) return;
    this.deletingId = job._id;
    this.secureService.deleteOvertimeJob(job._id).subscribe({
      next: () => {
        this.deletingId = null;
        this.jobs = this.jobs.filter((j) => j._id !== job._id);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.deletingId = null;
        this.fail(err);
      },
    });
  }

  hours(minutes: number): string {
    const h = Math.floor((minutes || 0) / 60);
    const m = (minutes || 0) % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  money(amount: number, job: OvertimeJob): string {
    const code = job.currency?.code || "KRW";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(amount || 0);
    } catch {
      return `${job.currency?.symbol || ""}${Math.round(amount || 0).toLocaleString()}`;
    }
  }

  private fail(err: HttpErrorResponse): void {
    this.loaded = true;
    this.errorMessage = err?.error?.message || this.translate.instant("overtime.jobs.loadFailed");
    this.cdr.markForCheck();
  }
}
