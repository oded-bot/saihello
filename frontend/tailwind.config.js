/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wiesn: {
          gold: '#C8A961',
          brown: '#5C3D2E',
          cream: '#FFF8ED',
          blue: '#1E3A5F',
          red: '#B22234',
          green: '#2D5016',
        },
        tinder: {
          pink: '#FE3C72',
          orange: '#FF6B6B',
          blue: '#0084FF',
          green: '#4CD964',
          yellow: '#F5B748',
          cyan: '#3AB4CC',
          purple: '#A65CE8',
          gray: '#E8E8E8',
        },
        dark: {
          bg: '#111111',
          card: '#1C1C1E',
          elevated: '#2C2C2E',
          separator: '#38383A',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
