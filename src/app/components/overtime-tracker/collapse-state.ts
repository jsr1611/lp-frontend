/**
 * Which collapsible sections are expanded, remembered per browser under one key per
 * place (payslip card, settings form...). Storage can be blocked (private mode) or
 * hold junk; either way every section simply starts collapsed.
 */
export class CollapseState<K extends string> {
  private state: Partial<Record<K, boolean>>;

  constructor(private readonly storageKey: string) {
    this.state = CollapseState.load(storageKey);
  }

  /** Expanded? Unset sections use `fallback` (collapsed unless told otherwise). */
  isOpen(section: K, fallback = false): boolean {
    return this.state[section] ?? fallback;
  }

  toggle(section: K, fallback = false): void {
    this.state = { ...this.state, [section]: !this.isOpen(section, fallback) };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Not saved; the toggle still works for this visit.
    }
  }

  private static load<K extends string>(key: string): Partial<Record<K, boolean>> {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
}
