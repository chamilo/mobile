/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        chamilo: {
          50: "#eef8fb",
          100: "#d5edf5",
          500: "#2c8db8",
          600: "#24759a",
          700: "#205f7c",
          900: "#1d4254",
        },
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
}
