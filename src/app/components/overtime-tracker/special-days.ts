import { Holiday } from "src/app/models/overtime";

export type SpecialKind = "seollal" | "chuseok" | "eidFitr" | "eidAdha" | "birthday" | "holiday";
export type FxPreset = "confetti" | "fireworks" | "lanterns" | "moon" | "crescent" | "balloons" | "late";

export interface SpecialDay {
  date: string;        // yyyy-MM-dd
  kind: SpecialKind;
  // 공휴일 name from the API, for the plain "holiday" kind.
  name?: string;
  emoji: string;
  // Festive days get a full-screen effect once; plain holidays only the day's banner.
  preset?: FxPreset;
}

// 설날 and 추석 follow the lunar calendar, so the day itself is listed and the holiday
// runs from the day before to the day after. Kept static rather than computed: a lunar
// calendar library would outweigh the rest of this page.
const SEOLLAL = ["2025-01-29", "2026-02-17", "2027-02-07", "2028-01-27", "2029-02-13", "2030-02-03"];
const CHUSEOK = ["2025-10-06", "2026-09-25", "2027-09-15", "2028-10-03", "2029-09-22", "2030-09-12"];
// Hijri holidays as announced in Uzbekistan. Moon sighting can move them by a day.
const EID_FITR = ["2025-03-30", "2026-03-20", "2027-03-10", "2028-02-27", "2029-02-15", "2030-02-05"];
const EID_ADHA = ["2025-06-06", "2026-05-27", "2027-05-16", "2028-05-05", "2029-04-24", "2030-04-13"];

function shift(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Special days falling in a "YYYY-MM" month: the festive table, the birthday, and any
 * other 공휴일 the lookup returned (as plain holidays, without a full-screen effect).
 */
export function specialDaysOf(month: string, holidays: Holiday[], birthday?: string | null): SpecialDay[] {
  const out: SpecialDay[] = [];
  const add = (date: string, day: Omit<SpecialDay, "date">) => {
    if (date.startsWith(month) && !out.some((s) => s.date === date && s.kind === day.kind)) {
      out.push({ date, ...day });
    }
  };
  for (const d of SEOLLAL) [-1, 0, 1].forEach((n) => add(shift(d, n), { kind: "seollal", emoji: "🧧", preset: "lanterns" }));
  for (const d of CHUSEOK) [-1, 0, 1].forEach((n) => add(shift(d, n), { kind: "chuseok", emoji: "🌕", preset: "moon" }));
  for (const d of EID_FITR) add(d, { kind: "eidFitr", emoji: "🌙", preset: "crescent" });
  for (const d of EID_ADHA) add(d, { kind: "eidAdha", emoji: "🕌", preset: "crescent" });

  if (birthday) {
    const md = String(birthday).slice(5, 10);
    const [y, m] = month.split("-").map(Number);
    let date = `${month}-${md.slice(3)}`;
    // Born on 29 Feb: celebrate on the 28th in other years.
    if (md === "02-29" && new Date(Date.UTC(y, 2, 0)).getUTCDate() === 28) date = `${month}-28`;
    if (md.slice(0, 2) === String(m).padStart(2, "0")) add(date, { kind: "birthday", emoji: "🎂", preset: "balloons" });
  }

  // Everything else the 공휴일 lookup knows about: 삼일절, 광복절, 한글날...
  for (const h of holidays || []) {
    if (!out.some((s) => s.date === h.date && (s.kind === "seollal" || s.kind === "chuseok"))) {
      add(h.date, { kind: "holiday", name: h.name, emoji: "🇰🇷" });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
