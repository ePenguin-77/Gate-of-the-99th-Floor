/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Noto Sans Thai", "Sarabun", "Georgia", "serif"],
        sans: ["Noto Sans Thai", "Sarabun", "system-ui", "sans-serif"],
      },
      colors: {
        ember: {
          300: "#f6b26b",
          400: "#d88b45",
          500: "#b85f2c",
        },
        ash: {
          900: "#101012",
          800: "#17171b",
          700: "#222229",
          500: "#5b5965",
        },
        veil: {
          900: "#111827",
          700: "#263044",
        },
      },
      boxShadow: {
        glow: "0 0 38px rgba(216, 139, 69, 0.14)",
      },
    },
  },
  plugins: [],
};
