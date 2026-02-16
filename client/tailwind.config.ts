import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#fdf8f0',
          100: '#f5e6d0',
          200: '#e8cba0',
          300: '#d4a86a',
          400: '#c48d42',
          500: '#a87232',
          600: '#8b5a2b',
          700: '#6b4226',
          800: '#4a2d1a',
          900: '#2d1a0e',
          950: '#1a0f08',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf5e6',
          200: '#f5e6cc',
          300: '#e8d4ab',
        },
        board: {
          light: '#e8cba0',
          dark: '#8b5a2b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
