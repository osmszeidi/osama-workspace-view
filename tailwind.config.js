/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}', './viewer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'] },
      colors: {
        ink: {
          950: '#0b0b0c', 900: '#111113', 850: '#16161a', 800: '#1b1b1f', 750: '#212126',
          700: '#2a2a30', 600: '#3a3a42', 500: '#5a5a64', 400: '#8a8a94', 300: '#b4b4bc', 200: '#d8d8de', 100: '#ededf0', 50: '#f6f6f7'
        },
        accent: { DEFAULT: '#c9a96e', soft: '#c9a96e26' }
      },
      boxShadow: { card: '0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6)', pop: '0 12px 40px -8px rgba(0,0,0,.7)' }
    }
  },
  plugins: []
}
