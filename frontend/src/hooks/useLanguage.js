import { create } from 'zustand';
import { translations } from '../i18n/translations';

const useLanguageStore = create((set, get) => ({
  lang: localStorage.getItem('sw_lang') || 'de',
  setLang: (lang) => {
    localStorage.setItem('sw_lang', lang);
    set({ lang });
  },
  t: (key) => {
    const lang = get().lang;
    return translations[lang]?.[key] || translations.de[key] || key;
  },
}));

export default function useLanguage() {
  return useLanguageStore();
}
