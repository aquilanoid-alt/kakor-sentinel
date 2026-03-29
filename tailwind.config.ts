import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        mist: "rgb(var(--color-mist) / <alpha-value>)",
        teal: "rgb(var(--color-teal) / <alpha-value>)",
        cyan: "rgb(var(--color-cyan) / <alpha-value>)",
        aqua: "rgb(var(--color-aqua) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(131, 167, 255, 0.12), 0 28px 120px rgba(3, 7, 16, 0.58)",
        neon: "0 0 44px rgba(95, 227, 204, 0.18)"
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at 16% 12%, rgba(255, 216, 144, 0.16), transparent 28%), radial-gradient(circle at 84% 16%, rgba(131, 167, 255, 0.18), transparent 28%), radial-gradient(circle at 70% 82%, rgba(95, 227, 204, 0.12), transparent 34%), linear-gradient(145deg, rgba(6, 11, 22, 0.98), rgba(10, 21, 42, 0.96))"
      },
      fontFamily: {
        heading: ["var(--font-exo)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
