import type { Config } from 'tailwindcss'
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- 5S Ethos "Hazard" palette (Xerox Black-Bloc). No blue, ever. ---
        '5s': {
          black: '#0B0B0B', paper: '#F6F3EA', newsprint: '#ECE7D6', white: '#FFFFFF',
          red: '#E0241F', 'red-ink': '#B81A16', 'red-press': '#A8160F',
          amber: '#F2B400', 'amber-ink': '#8A6500',
        },
        // LIDS class names remapped onto the Hazard palette so existing
        // utilities (bg-li-red, text-ink-700, …) adopt the 5S brand at once.
        li: {
          yellow: '#F2B400', 'yellow-700': '#8A6500', 'yellow-100': '#FBE8A6',
          red: '#E0241F', 'red-700': '#B81A16', 'red-100': '#F7D6D4',
          green: '#2E7D32', 'green-700': '#1E5E22', 'green-100': '#D6E8D6',
          teal: '#F2B400', 'teal-700': '#8A6500', 'teal-100': '#FBE8A6',
          'blue-700': '#B81A16', 'blue-100': '#F7D6D4',
        },
        ink: {
          1000: '#0B0B0B', 900: '#1C1A17', 800: '#3D3A34', 700: '#3D3A34',
          600: '#6E6A60', 500: '#6E6A60', 400: '#A6A299', 300: '#A6A299',
          200: '#D7D2C6', 150: '#D7D2C6', 100: '#E7E2D6', 50: '#ECE7D6', 0: '#FFFFFF',
        },
        paper: '#F6F3EA',
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
        // Remapped to the 5S Ethos type system (Xerox Black-Bloc).
        formula: ['"Saira Stencil One"', '"Archivo Black"', 'system-ui', 'sans-serif'],
        narrow: ['Poppins', 'system-ui', 'sans-serif'],
        stencil: ['"Saira Stencil One"', '"Archivo Black"', 'system-ui', 'sans-serif'],
        heavy: ['"Archivo Black"', 'Poppins', 'system-ui', 'sans-serif'],
        marker: ['"Permanent Marker"', 'cursive'],
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
