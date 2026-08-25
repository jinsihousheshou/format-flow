import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#181B2A",
      },
      boxShadow: {
        glow: "0 24px 70px -28px rgba(91, 67, 255, 0.42)",
      },
    },
  },
  plugins: [],
} satisfies Config;
