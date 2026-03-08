import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        platform: {
          accent: "hsl(var(--platform-accent))",
          "accent-soft": "hsl(var(--platform-accent-soft))",
          "accent-foreground": "hsl(var(--platform-accent-foreground))",
          success: "hsl(var(--platform-success))",
          "success-soft": "hsl(var(--platform-success-soft))",
          warning: "hsl(var(--platform-warning))",
          "warning-soft": "hsl(var(--platform-warning-soft))",
          info: "hsl(var(--platform-info))",
          surface: "hsl(var(--platform-surface))",
          "surface-hover": "hsl(var(--platform-surface-hover))",
          "surface-active": "hsl(var(--platform-surface-active))",
          "surface-elevated": "hsl(var(--platform-surface-elevated))",
        },
        doc: {
          link: "hsl(var(--doc-link))",
          section: "hsl(var(--doc-section-line))",
          code: "hsl(var(--doc-code-bg))",
          note: "hsl(var(--doc-note-bg))",
          "note-border": "hsl(var(--doc-note-border))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        "platform-sm": "0 1px 3px 0 hsl(var(--foreground) / 0.04), 0 1px 2px -1px hsl(var(--foreground) / 0.04)",
        "platform-md": "0 4px 12px -2px hsl(var(--foreground) / 0.08), 0 2px 4px -2px hsl(var(--foreground) / 0.04)",
        "platform-lg": "0 12px 32px -4px hsl(var(--foreground) / 0.12), 0 4px 8px -2px hsl(var(--foreground) / 0.06)",
        "platform-xl": "0 20px 48px -8px hsl(var(--foreground) / 0.16), 0 8px 16px -4px hsl(var(--foreground) / 0.08)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "shimmer": "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
