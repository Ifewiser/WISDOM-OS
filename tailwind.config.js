/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f5f5f6',
          100: '#e7e7ea',
          200: '#c9c9ce',
          300: '#a0a0a8',
          400: '#71717a',
          500: '#52525b',
          600: '#3f3f46',
          700: '#2a2a31',
          800: '#1c1c20',
          850: '#151518',
          900: '#0f0f12',
          950: '#0a0a0b',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
