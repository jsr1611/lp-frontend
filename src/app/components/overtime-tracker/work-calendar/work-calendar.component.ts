import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from "@angular/core";
import { LeaveDay, OvertimeEntry, Punctuality } from "src/app/models/overtime";
import { lateMinutesOf } from "../punctuality";
import { SpecialDay } from "../special-days";

type DayState = "ontime" | "late" | "excused" | "restWork" | "leave" | "none";

interface CalendarCell {
  iso: string;
  day: number;
  inMonth: boolean;
  weekend: boolean;
  today: boolean;
  state: DayState;
  lateMinutes: number;
  special: SpecialDay | null;
  milestone: boolean;
  title: string;
}

/**
 * The on-time streak and a month calendar of how each day went. Shown as a sticky
 * sidebar on wide screens, and as a collapsed bar everywhere else.
 */
@Component({
  selector: "app-work-calendar",
  templateUrl: "./work-calendar.component.html",
  styleUrls: ["./work-calendar.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class WorkCalendarComponent implements OnChanges {
  @Input() month = "";                 // "YYYY-MM"
  @Input() today = "";                 // "yyyy-MM-dd"
  @Input() entries: OvertimeEntry[] = [];
  @Input() leaveDays: LeaveDay[] = [];
  @Input() specialDays: SpecialDay[] = [];
  @Input() punctuality: Punctuality | null | undefined;
  @Input() graceMinutes = 0;
  @Input() shiftStart = "09:00";
  // Collapsible = the bar version; starts closed.
  @Input() collapsible = false;
  @Output() dayPick = new EventEmitter<string>();
  @Output() monthShift = new EventEmitter<number>();

  open = false;
  cells: CalendarCell[] = [];
  // Weekday header, Monday first, matching the cells.
  readonly weekdays = [1, 2, 3, 4, 5, 6, 0];
  monthDate: Date | null = null;

  ngOnChanges(): void {
    this.build();
  }

  get glowing(): boolean {
    return !!this.punctuality?.milestones?.today;
  }

  get progress(): number {
    const p = this.punctuality;
    const next = p?.milestones?.upcoming;
    if (!p?.since || !next) return 1;
    const total = p.calendarDays + (next.inDays || 0);
    return total ? p.calendarDays / total : 0;
  }

  pick(cell: CalendarCell): void {
    if (cell.inMonth && cell.state !== "none") this.dayPick.emit(cell.iso);
  }

  private build(): void {
    if (!/^\d{4}-\d{2}$/.test(this.month)) return;
    const [y, m] = this.month.split("-").map(Number);
    this.monthDate = new Date(Date.UTC(y, m - 1, 1));
    const byDate = new Map(this.entries.map((e) => [String(e.date).slice(0, 10), e]));
    const leaveDates = new Set(this.leaveDays.map((l) => String(l.date).slice(0, 10)));
    const reachedOn = new Set((this.punctuality?.milestones?.reached || []).map((r) => r.on));

    // Grid starts on the Monday on or before the 1st, and runs whole weeks.
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;

    const cells: CalendarCell[] = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(Date.UTC(y, m - 1, 1 - lead + i));
      const iso = d.toISOString().slice(0, 10);
      const entry = byDate.get(iso);
      let state: DayState = "none";
      let lateMinutes = 0;
      if (entry) {
        lateMinutes = lateMinutesOf(entry, this.graceMinutes, this.shiftStart);
        state = entry.isRestDay ? "restWork" : !lateMinutes ? "ontime" : entry.lateExcused ? "excused" : "late";
      } else if (leaveDates.has(iso)) {
        state = "leave";
      }
      const special = this.specialDays.find((s) => s.date === iso) || null;
      const parts = [special ? (special.name || special.emoji) : "", entry ? `${entry.startTime}–${entry.endTime}` : ""];
      cells.push({
        iso, day: d.getUTCDate(), inMonth: d.getUTCMonth() === m - 1,
        weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
        today: iso === this.today, state, lateMinutes, special,
        milestone: reachedOn.has(iso), title: parts.filter(Boolean).join(" · "),
      });
    }
    this.cells = cells;
  }
}
