/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#030308',
        surface: '#0a0a12',
        card: '#0d0d16',
        cardHover: '#12121e',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        accent: '#10b981',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-sm': '0 0 20px -5px rgba(255,255,255,0.05)',
        'glow-md': '0 0 40px -10px rgba(255,255,255,0.08)',
        'glow-lg': '0 8px 60px -15px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
