export type LangCode = 'uz' | 'en' | 'ru' | 'ko' | 'ar';

export interface LanguageDef {
  code: LangCode;
  /** Name written in the language itself, so the switcher is readable to its own speakers. */
  label: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: readonly LanguageDef[] = [
  { code: 'uz', label: "O'zbekcha", dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'ko', label: '한국어', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

export const DEFAULT_LANG: LangCode = 'uz';

/** Also read by the boot script in index.html, which cannot import from here. */
export const LANG_STORAGE_KEY = 'app.lang';

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === 'string' && LANGUAGES.some((l) => l.code === value);
}

export function langDef(code: LangCode): LanguageDef {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/**
 * The language the app should boot in: an explicit choice wins, otherwise the
 * browser's preference if we speak it, otherwise Uzbek.
 *
 * index.html runs an inlined equivalent of this before first paint to pick the
 * Bootstrap LTR/RTL stylesheet. Keep the two in step.
 */
export function resolveInitialLang(): LangCode {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    // Private mode / storage disabled — fall through to the browser preference.
  }
  if (isLangCode(stored)) {
    return stored;
  }

  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  for (const tag of preferred) {
    const base = tag?.split('-')[0]?.toLowerCase();
    if (isLangCode(base)) {
      return base;
    }
  }
  return DEFAULT_LANG;
}
