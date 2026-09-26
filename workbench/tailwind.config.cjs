/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#020617',
          800: '#020617',
          700: '#020617'
        },
      },
    },
  },
  plugins: [],
};

