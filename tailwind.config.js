/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#0f131c',
        surface: '#1a1f2e',
        card: '#1c1f29',
        primary: '#dcb8ff',
        secondary: '#00fbfb',
        tertiary: '#ffb1c4',
        muted: '#a0a0a0',
        bubble: '#381e59',
      }
    },
  },
  plugins: [],
}
