/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tinder: {
          pink: '#EC4899',
          orange: '#F97316',
          blue: '#3B82F6',
          green: '#22C55E',
          yellow: '#EAB308',
          cyan: '#06B6D4',
          purple: '#7C3AED',
          gray: '#E8E8E8',
        },
        app: {
          violet: '#7C3AED',
          pink: '#EC4899',
          neon: '#A78BFA',
        },
        dark: {
          bg: '#000000',
          card: '#0F0F0F',
          elevated: '#1A1A1A',
          separator: '#2A2A2A',
          muted: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
