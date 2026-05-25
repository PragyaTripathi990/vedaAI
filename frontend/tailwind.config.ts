import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Figma palette
        bg: "#F3F2F0",          // app background (soft warm gray)
        surface: "#FFFFFF",
        sidebar: "#FFFFFF",
        line: "#ECEAE7",
        muted: "#F7F6F4",
        ink: {
          900: "#1A1A1A",
          700: "#3D3D3D",
          500: "#6B6B6B",
          400: "#9A9A9A",
          300: "#BDBDBD",
          200: "#E2E0DD",
          100: "#F1EFEC",
        },
        accent: {
          DEFAULT: "#F26B3A",    // orange CTA accent
          50: "#FEF1EB",
          100: "#FBDDCB",
          500: "#F26B3A",
          600: "#DC5A2D",
          700: "#B84823",
        },
        easy: "#0A8D4A",
        moderate: "#C97B00",
        hard: "#C0382E",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        sidebar: "0 10px 30px rgba(15, 15, 15, 0.06)",
        card: "0 1px 2px rgba(15,15,15,0.04), 0 8px 24px rgba(15,15,15,0.04)",
        cta: "0 0 0 2px #F26B3A, 0 8px 18px rgba(242,107,58,0.18)",
        pop: "0 18px 40px rgba(15,15,15,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
