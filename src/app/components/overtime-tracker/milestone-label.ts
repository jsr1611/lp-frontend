import { TranslateService } from "@ngx-translate/core";
import { Milestone } from "src/app/models/overtime";

// Money in the viewer's language, for strings built in code rather than templates.
export function formatMoney(translate: TranslateService, amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(translate.getCurrentLang() || "en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

// "Day 500", "2-year anniversary", "100h of overtime"... One translated pattern per
// kind, so each language decides where the number goes.
export function milestoneLabel(translate: TranslateService, m: Milestone): string {
  const value = m.kind === "earnings" ? formatMoney(translate, m.value, m.currency || "KRW") : m.value;
  return translate.instant(`overtime.milestones.${m.kind}`, { value });
}

// How far off an upcoming milestone is: "in 12 days" or "40h to go".
export function milestoneDistance(translate: TranslateService, m: Milestone): string {
  if (m.inDays !== undefined) return translate.instant("overtime.milestones.inDays", { n: m.inDays });
  if (m.kind === "earnings") {
    return translate.instant("overtime.milestones.toGo", {
      value: formatMoney(translate, m.remaining || 0, m.currency || "KRW"),
    });
  }
  return translate.instant("overtime.milestones.hoursToGo", { n: m.remaining || 0 });
}
