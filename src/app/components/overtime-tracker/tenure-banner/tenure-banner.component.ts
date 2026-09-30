import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { CompanyInfo, LeaveLedger, Milestone, Tenure } from "src/app/models/overtime";
import { milestoneDistance, milestoneLabel } from "../milestone-label";

// How many upcoming milestones the banner lists.
const UPCOMING_SHOWN = 3;

/**
 * The job at a glance: how long, what is left of the month, and what comes next.
 * Not tied to the month being viewed, so it sits above the month picker.
 */
@Component({
  selector: "app-tenure-banner",
  templateUrl: "./tenure-banner.component.html",
  styleUrls: ["./tenure-banner.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class TenureBannerComponent {
  private readonly translate = inject(TranslateService);

  @Input() tenure: Tenure | null = null;
  @Input() leave: LeaveLedger | null = null;
  @Input() company: CompanyInfo | undefined;
  @Input() set upcoming(list: Milestone[] | undefined) {
    this.nextMilestones = (list || []).slice(0, UPCOMING_SHOWN);
  }
  @Output() addStartDate = new EventEmitter<void>();

  nextMilestones: Milestone[] = [];
  // Details fold away on phones; the headline line stays.
  expanded = false;

  label(m: Milestone): string {
    return milestoneLabel(this.translate, m);
  }

  distance(m: Milestone): string {
    return milestoneDistance(this.translate, m);
  }

  get progressPercent(): number {
    return Math.round((this.tenure?.nextAnniversary?.progress || 0) * 100);
  }
}
