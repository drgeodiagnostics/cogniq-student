/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // <--- ADD THIS LINE (Enables System Dark Mode)
  theme: {
    extend: {},
  },
  plugins: [],
}