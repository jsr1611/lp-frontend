import { Category } from "../models/word";

/**
 * Maps the backend `Category` enum to i18n keys for its display label.
 * The enum values themselves are backend data and must not change.
 * Consumers render these through the `translate` pipe/service.
 */
export const CategoryMapping: { [key in Category]: string } = {
  [Category.Verb]: 'category.verb',
  [Category.Noun]: 'category.noun',
  [Category.Adjective]: 'category.adjective',
  [Category.Adverb]: 'category.adverb',
  [Category.Preposition]: 'category.preposition',
  [Category.Conjunction]: 'category.conjunction',
  [Category.Number]: 'category.number',
  [Category.Other]: 'category.other'
};


export enum TestingLangulages {
  uz_ar = "O`zbekcha-Arabcha",
  uz_en = "O`zbekcha-Inglizcha",
  ar_uz = "Arabcha-O`zbekcha",
  ar_en = "Arabcha-Inglizcha",
  en_uz = "Inglizcha-O`zbekcha",
  en_ar = "Inglizcha-Arabcha"
};

/**
 * Display labels for the dictionary language PAIR under test.
 * This is a domain choice (which languages the quiz translates between),
 * not the UI language — but the pair's NAME is chrome, so it is localized.
 */
export const TestingLanguagesMapping: { [key in TestingLangulages]: string } = {
  [TestingLangulages.uz_ar]: 'tests.langPair.uzAr',
  [TestingLangulages.uz_en]: 'tests.langPair.uzEn',
  [TestingLangulages.ar_uz]: 'tests.langPair.arUz',
  [TestingLangulages.ar_en]: 'tests.langPair.arEn',
  [TestingLangulages.en_uz]: 'tests.langPair.enUz',
  [TestingLangulages.en_ar]: 'tests.langPair.enAr'
};
