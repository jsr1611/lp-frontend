import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { LeaveLedger } from "src/app/models/overtime";

// Annual leave (연차) balance. The figures are computed by the backend from the start
// date and the logged days off; this only lays them out.
@Component({
  selector: "app-leave-card",
  templateUrl: "./leave-card.component.html",
  styleUrls: ["./leave-card.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class LeaveCardComponent {
  @Input() leave: LeaveLedger | null = null;
  // Days off in the month being viewed.
  @Input() usedThisMonth = 0;
  @Output() logDayOff = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
}
