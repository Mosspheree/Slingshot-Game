/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body': ['Roboto', 'sans-serif'],
      },
      colors: {
        'cyber': {
          'dark': '#0a0a0f',
          'panel': '#121218',
          'accent': '#00f0ff',
          'secondary': '#ff00aa',
          'success': '#00ff88',
          'warning': '#ffaa00',
        }
      }
    },
  },
  plugins: [],
}