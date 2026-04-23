/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        card: '#18181b',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        accent: '#10b981',
      }
    },
  },
  plugins: [],
}
