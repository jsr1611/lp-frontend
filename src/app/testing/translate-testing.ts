import {
  TranslateNoOpLoader,
  TranslatePipe,
  provideTranslateLoader,
  provideTranslateService,
} from '@ngx-translate/core';
import { DEFAULT_LANG } from '../mappings/languages';

/**
 * Translation setup for TestBed.
 *
 * AppModule imports TranslatePipe and provides TranslateService for the real app, but a
 * TestBed builds its own module and gets neither. Spread both of these into any
 * configureTestingModule whose component renders `| translate`.
 *
 * The no-op loader keeps tests off the network: keys resolve to themselves, which is all
 * a "should create" test needs, and it means specs don't depend on catalog contents.
 */
export const translateTestingImports = [TranslatePipe];

export const translateTestingProviders = provideTranslateService({
  lang: DEFAULT_LANG,
  fallbackLang: DEFAULT_LANG,
  loader: provideTranslateLoader(TranslateNoOpLoader),
});
