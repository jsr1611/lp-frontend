import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import localeEn from '@angular/common/locales/en';
import localeKo from '@angular/common/locales/ko';
import localeRu from '@angular/common/locales/ru';
import localeUz from '@angular/common/locales/uz';
import { DOCUMENT, inject, Injectable, LOCALE_ID, Provider, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  LANG_STORAGE_KEY,
  LANGUAGES,
  LangCode,
  LanguageDef,
  langDef,
  resolveInitialLang,
} from '../mappings/languages';

/**
 * Angular ships locale data per-locale and tree-shakes the rest, so every
 * language we offer has to be registered explicitly or DatePipe/CurrencyPipe
 * silently fall back to en-US.
 */
export function registerAppLocales(): void {
  registerLocaleData(localeUz, 'uz');
  registerLocaleData(localeEn, 'en');
  registerLocaleData(localeRu, 'ru');
  registerLocaleData(localeKo, 'ko');
  registerLocaleData(localeAr, 'ar');
}

/** Binds LOCALE_ID to the stored language so date/number/currency match the UI. */
export function provideAppLocaleId(): Provider {
  return { provide: LOCALE_ID, useFactory: () => resolveInitialLang() };
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<LangCode>(resolveInitialLang());

  readonly currentLang = this.current.asReadonly();
  readonly languages = LANGUAGES;

  get currentDef(): LanguageDef {
    return langDef(this.current());
  }

  get isRtl(): boolean {
    return this.currentDef.dir === 'rtl';
  }

  /** Called once at bootstrap, after which <html> and the catalog agree. */
  init(): void {
    const lang = this.current();
    this.translate.use(lang);
    this.applyToDocument(lang);
  }

  /**
   * Switches language and reloads.
   *
   * The reload is deliberate. LOCALE_ID is resolved once at bootstrap, and the
   * Bootstrap LTR/RTL stylesheet is chosen in index.html before first paint —
   * so swapping the catalog alone would leave dates, currency and layout
   * direction still speaking the old language. Reloading is what makes the
   * whole page agree.
   */
  use(lang: LangCode): void {
    if (lang === this.current()) {
      return;
    }
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Storage unavailable: apply in-memory and skip the reload, so the user
      // at least gets translated strings for this session.
      this.current.set(lang);
      this.translate.use(lang);
      this.applyToDocument(lang);
      return;
    }
    this.document.location.reload();
  }

  private applyToDocument(lang: LangCode): void {
    const el = this.document.documentElement;
    el.lang = lang;
    el.dir = langDef(lang).dir;
  }
}
