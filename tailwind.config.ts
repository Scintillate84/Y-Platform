import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        y: {
          50: "#f0f0f0",
          100: "#e0e0e0",
          200: "#c0c0c0",
          300: "#a0a0a0",
          400: "#808080",
          500: "#606060",
          600: "#505050",
          700: "#404040",
          800: "#303030",
          900: "#202020",
        },
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
