/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#15191E',
        surface: '#22262E',
        card: '#272C35',
        primary: '#0DBD8B',
        secondary: '#03B381',
        tertiary: '#E3F7F2',
        muted: '#a0a0a0',
        bubble: '#0DBD8B',
      }
    },
  },
  plugins: [],
}
