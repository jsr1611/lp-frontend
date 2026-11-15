import { NumberSymbol, getLocaleNumberSymbol } from "@angular/common";
import { Directive, ElementRef, HostListener, Input, LOCALE_ID, forwardRef, inject } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

/**
 * A money field that groups thousands while you type: 1234567 shows as 1,234,567
 * (or 1 234 567 — separators follow the app's language, like CurrencyPipe does)
 * keystroke by keystroke, the caret staying where it was. The model still gets a plain
 * number (or null when empty), so `[(ngModel)]` works as with `type="number"`.
 *
 *   <input appMoney name="salary" [(ngModel)]="salary" />
 *   <input appMoney [decimals]="2" ... />   // cents allowed
 */
@Directive({
  selector: "input[appMoney]",
  standalone: false,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoneyInputDirective), multi: true }],
  host: { type: "text", inputmode: "decimal", autocomplete: "off" },
})
export class MoneyInputDirective implements ControlValueAccessor {
  private readonly el: HTMLInputElement = inject(ElementRef).nativeElement;
  private readonly locale = inject(LOCALE_ID);
  private readonly group = getLocaleNumberSymbol(this.locale, NumberSymbol.Group);
  private readonly decimal = getLocaleNumberSymbol(this.locale, NumberSymbol.Decimal);

  // Digits allowed after the decimal point. Won have none, but loans and other
  // currencies may need cents.
  @Input() decimals = 0;

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | string | null | undefined): void {
    this.el.value = value === null || value === undefined || value === "" ? "" : this.render(this.parse(String(value), true));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.el.disabled = disabled;
  }

  @HostListener("input")
  onInput(): void {
    const raw = this.el.value;
    // Where the caret is, counted in meaningful characters so commas don't shift it.
    const caret = this.el.selectionStart ?? raw.length;
    const before = this.parse(raw.slice(0, caret)).length;

    const plain = this.parse(raw);
    const formatted = this.render(plain);
    this.el.value = formatted;

    // Put the caret back after the same number of digits / decimal marks.
    let pos = 0;
    for (let seen = 0; pos < formatted.length && seen < before; pos++) {
      if (/\d/.test(formatted[pos]) || formatted[pos] === this.decimal) seen++;
    }
    this.el.setSelectionRange(pos, pos);

    this.onChange(plain === "" || plain === "." ? null : Number(plain));
  }

  @HostListener("blur")
  onBlur(): void {
    // A trailing decimal mark is fine mid-typing but not once done.
    if (this.el.value.endsWith(this.decimal)) this.el.value = this.el.value.slice(0, -1);
    this.onTouched();
  }

  /**
   * What was typed, as a plain number string ("1234567.5"): digits plus at most one
   * point, cut to `decimals`. The language's decimal mark and "." both start the
   * fraction (unless "." is the grouping mark); grouping marks and spaces are dropped.
   * `canonical` is for values from the model, which always use ".".
   */
  private parse(input: string, canonical = false): string {
    const marks = canonical ? ["."] : [this.decimal, ...(this.group === "." ? [] : ["."])];
    let out = "";
    for (const ch of input) {
      if (/\d/.test(ch)) out += ch;
      // A whole-number field shows a stored fraction cut off, not glued on.
      else if (canonical && ch === "." && this.decimals === 0) break;
      else if (marks.includes(ch) && this.decimals > 0 && !out.includes(".")) out += ".";
    }
    const [whole, fraction] = out.split(".");
    const trimmed = whole.replace(/^0+(?=\d)/, "");
    return fraction === undefined ? trimmed : `${trimmed || "0"}.${fraction.slice(0, this.decimals)}`;
  }

  /** "1234567.5" -> "1,234,567.5" or "1 234 567,5", per the language. */
  private render(plain: string): string {
    const [whole, fraction] = plain.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, this.group);
    return fraction === undefined ? grouped : grouped + this.decimal + fraction;
  }
}
