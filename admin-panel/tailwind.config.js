/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "#e5e7eb",

        primary: {
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985"
        },

        success: {
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534"
        },

        warning: {
          100: "#fef9c3",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e"
        },

        danger: {
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b"
        }
      }
    }
  },
  plugins: [],
};
