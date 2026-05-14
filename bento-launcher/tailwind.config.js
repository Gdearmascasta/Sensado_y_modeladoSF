/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist grid span classes so Tailwind doesn't purge them when generated dynamically
  safelist: [
    'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4',
    'row-span-1', 'row-span-2',
    'sm:col-span-1', 'sm:col-span-2',
    'lg:col-span-1', 'lg:col-span-2', 'lg:col-span-3', 'lg:col-span-4',
    'lg:row-span-1', 'lg:row-span-2',
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
        'glow-xl': '0 0 80px -20px rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}
