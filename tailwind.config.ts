import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        solice: {
          black: "#000000",
          panel: "#06101d",
          panelSoft: "#0b1625",
          blue: "#38bdf8",
          glow: "#7dd3fc",
          text: "#f8fbff",
          muted: "#8ba2b8",
        },
      },
      boxShadow: {
        "solice-blue": "0 0 80px rgba(56, 189, 248, 0.28)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
