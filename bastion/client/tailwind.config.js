/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#0f172a',      // slate-900
          secondary: '#1e293b', // slate-800
          tertiary: '#334155',  // slate-700
        },
        accent: {
          primary: '#3b82f6',   // blue-500
          hover: '#2563eb',     // blue-600
        }
      }
    },
  },
  plugins: [],
}
