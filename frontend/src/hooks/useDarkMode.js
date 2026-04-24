import { create } from 'zustand';

const useDarkModeStore = create((set) => ({
  darkMode: localStorage.getItem('sw_darkMode') === 'true',
  toggle: () => set((state) => {
    const next = !state.darkMode;
    localStorage.setItem('sw_darkMode', next.toString());
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: next };
  }),
  init: () => {
    const saved = localStorage.getItem('sw_darkMode') === 'true';
    if (saved) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: saved });
  },
}));

export default function useDarkMode() {
  return useDarkModeStore();
}
