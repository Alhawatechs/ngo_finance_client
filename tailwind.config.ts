import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['72', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        '72': ['72', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        /** Classic book / ledger titles (chart of accounts, formal reports) */
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        /** NGO finance brand — forest green (aligned with public marketing) */
        primary: {
          DEFAULT: "#14532d",
          dark: "#0f3d22",
          light: "#166534",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#505a64",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#f3f4f6",   // gray-100 - neutral, professional dropdown selection
          foreground: "#374151",
        },
        success: {
          DEFAULT: "#107c10",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f39c12",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      ringWidth: {
        "0.5": "0.5px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(20, 83, 45, 0.07)",
        "card-hover": "0 4px 12px rgba(20, 83, 45, 0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "dialog-enter": {
          from: { opacity: "0", transform: "translate(-50%, -50%) scale(0.9)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "dialog-exit": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -50%) scale(0.9)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "dialog-enter": "dialog-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "dialog-exit": "dialog-exit 0.15s cubic-bezier(0.4, 0, 1, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
