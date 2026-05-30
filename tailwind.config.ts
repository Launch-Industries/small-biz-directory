import type { Config } from 'tailwindcss'
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- LIDS brand palette (unchanged) ---
        li: {
          yellow: '#ffd100', 'yellow-700': '#d9b000', 'yellow-100': '#fff6cc',
          red: '#f9465c', 'red-700': '#d9304a', 'red-100': '#ffd9de',
          green: '#14d592', 'green-700': '#0fae77', 'green-100': '#c9f4e2',
          teal: '#51d9dd', 'teal-700': '#2eb8bc', 'teal-100': '#d6f5f6',
          'blue-700': '#1a35d9', 'blue-100': '#d6deff',
        },
        ink: {
          1000: '#0a0c10', 900: '#14171d', 800: '#1f242c', 700: '#353c47',
          600: '#4f5763', 500: '#6b7380', 400: '#8f96a1', 300: '#b8bdc5',
          200: '#dadde2', 150: '#e8eaee', 100: '#f1f2f5', 50: '#f7f8fa', 0: '#ffffff',
        },
        paper: '#fbf9f4',
        // --- shadcn/ui semantic tokens (bridged onto ink/li via CSS vars) ---
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        formula: ['"PP Formula"', 'system-ui', 'sans-serif'],
        narrow: ['"PP Formula Narrow"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
