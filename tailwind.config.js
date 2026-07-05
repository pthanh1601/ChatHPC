/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: '#1c1c1e',
        card: '#2c2c2e',
        primary: '#3390ec',
        secondary: '#4ea4f5',
        tertiary: '#e3f2fd',
        muted: '#8e8e93',
        bubble: '#3390ec',
      }
    },
  },
  plugins: [],
}
