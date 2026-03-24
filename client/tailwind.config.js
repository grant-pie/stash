/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          1: '#161b22',
          2: '#1c2128',
          3: '#21262d',
        },
      },
    },
  },
  plugins: [],
};
