import { create } from 'zustand';

// Dark mode is the default — always initialize as dark
function initDark() {
  document.documentElement.classList.add('dark');
  return true;
}

const useDarkModeStore = create((set) => ({
  darkMode: true,
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
    // Respect explicit user opt-out of dark mode, otherwise stay dark
    const saved = localStorage.getItem('sw_darkMode');
    const isDark = saved === null ? true : saved === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: isDark });
  },
}));

export default function useDarkMode() {
  return useDarkModeStore();
}
