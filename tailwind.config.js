/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae7ff',
          200: '#b9d0ff',
          300: '#8fb3ff',
          400: '#5f8dff',
          500: '#3a66f5',
          600: '#2a4bd8',
          700: '#233dae',
          800: '#20358a',
          900: '#1e2f6e',
        },
      },
    },
  },
  plugins: [],
}

