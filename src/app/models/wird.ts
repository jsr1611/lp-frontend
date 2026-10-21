export type WirdStatus = 'open' | 'done';

// A user-defined list grouping entries ("Qada prayers", "Daily wirds", "Borrowed items", ...).
export interface WirdList {
  _id?: string;
  name: string;
  icon?: string;
  labels: string[];        // optional quick counters shown as tiles (e.g. Fajr, Isha, Witr)
  keepByDefault?: boolean; // new entries start with "keep in history" on
  order?: number;
}

// One step of progress: made up, done once, part returned, ...
export interface WirdProgress {
  _id?: string;
  date: string;   // ISO date (yyyy-MM-dd)
  count: number;
  note?: string;
}

// A general entry: a note, a task, or something owed N times.
export interface Wird {
  _id?: string;
  listId?: string;
  label?: string;     // one of the list's labels, so it counts toward that tile
  title?: string;
  date?: string;      // when it happened / was missed
  time?: string;      // HH:mm
  count: number;
  progress?: WirdProgress[];
  dueDate?: string;
  note?: string;
  keep?: boolean;     // stays in history once done
  status?: WirdStatus;
  completedAt?: string;
  // Virtuals returned by the backend:
  doneCount?: number;
  remaining?: number;
  created_at?: string;
}

// Per-list summary; listId is 'none' for entries outside any list.
export interface WirdListSummary {
  listId: string;
  open: number;
  overdue: number;
  remaining: Record<string, number>; // per label, still open
  done: Record<string, number>;      // per label, done so far
}

// 'history' = done and kept; 'done' = every done entry.
export type WirdListStatus = 'open' | 'history' | 'done' | 'all';
