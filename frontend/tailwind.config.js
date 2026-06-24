/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        cardBg: "rgba(22, 28, 45, 0.7)",
        accentGreen: "#10B981",
        accentIndigo: "#6366F1",
        borderGlass: "rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      }
    },
  },
  plugins: [],
}
