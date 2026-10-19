import { OvertimeEntry } from "src/app/models/overtime";

const MINUTES_PER_DAY = 24 * 60;
const HALF_DAY_MINUTES = 12 * 60;

const toMinutes = (hhmm: string) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

/**
 * Minutes late, 0 when on time. Mirrors lateMinutesOf() in arabic_backend/lib/punctuality.js,
 * which stays authoritative for the streak. 09:00 against a 09:00 start is on time, 09:01
 * is late; grace pushes that line later. Rest days have no start to miss.
 */
export function lateMinutesOf(
  entry: Pick<OvertimeEntry, "startTime" | "shiftStart" | "isRestDay">,
  graceMinutes = 0,
  fallbackShiftStart = "09:00",
): number {
  const shiftStart = entry.shiftStart || fallbackShiftStart;
  if (!entry || entry.isRestDay || !entry.startTime || !shiftStart) return 0;
  const start = toMinutes(entry.startTime);
  let shift = toMinutes(shiftStart);
  // Same-day alignment as the overtime maths, so night shifts read sensibly.
  if (shift - start > HALF_DAY_MINUTES) shift -= MINUTES_PER_DAY;
  else if (start - shift > HALF_DAY_MINUTES) shift += MINUTES_PER_DAY;
  return Math.max(0, start - shift - (graceMinutes || 0));
}
