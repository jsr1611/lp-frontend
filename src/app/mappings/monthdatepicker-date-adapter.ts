import { NativeDateAdapter } from "@angular/material/core";

export class MonthpickerDateAdapter extends NativeDateAdapter {
    // Angular Material v22+ resolves the locale via inject() inside NativeDateAdapter,
    // so no constructor/locale argument is needed here anymore.

    override parse(value: string): Date | null {
      const monthAndYearRegex = /(10|11|12|0\d|\d)\/[\d]{4}/;
      if (value?.match(monthAndYearRegex)) {
        const parts = value.split('/');
        const month = Number(parts[0]);
        const year = Number(parts[1]);
        if (month > 0 && month <= 12) {
          return new Date(year, month - 1);
        }
      }
      return null;
    }
  
    override format(date: Date, displayFormat: any): string {
      const options = { year: 'numeric', month: 'long' } as const;
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }    
  }