import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';

const STORAGE_KEY = 'nusuk.locale';
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
const initial = stored === 'en' || stored === 'ar' ? stored : 'en';

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Sync <html> dir/lang with initial locale so first paint matches.
if (typeof document !== 'undefined') {
  document.documentElement.lang = initial;
  document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';
}

export function setLocale(locale: 'ar' | 'en'): void {
  void i18n.changeLanguage(locale);
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export default i18n;
