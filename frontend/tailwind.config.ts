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
      fontFamily: {
        'sans': ['Manrope', 'ui-sans-serif', 'system-ui'],
        'manrope': ['Manrope', 'sans-serif'],
      },
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
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "scale-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.95)"
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)"
          }
        },
        "slide-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)"
          }
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)"
          },
          "50%": {
            transform: "translateY(-10px)"
          }
        },
        "glow": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0.5"
          }
        },
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center"
          },
          "50%": {
            "background-size": "200% 200%", 
            "background-position": "right center"
          }
        },
        "pulse-glow": {
          "0%, 100%": {
            "box-shadow": "0 0 20px hsl(263 70% 50.4% / 0.3), 0 0 40px hsl(263 70% 50.4% / 0.1)"
          },
          "50%": {
            "box-shadow": "0 0 30px hsl(263 70% 50.4% / 0.6), 0 0 60px hsl(263 70% 50.4% / 0.3)"
          }
        },
        "record-pulse": {
          "0%": {
            "transform": "scale(1)",
            "opacity": "1"
          },
          "50%": {
            "transform": "scale(1.1)",
            "opacity": "0.8"
          },
          "100%": {
            "transform": "scale(1)",
            "opacity": "1"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "scale-in": "scale-in 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.5s ease-out",
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
        "gradient-x": "gradient-x 15s ease infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "record-pulse": "record-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
