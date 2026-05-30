import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        formula: ['"PP Formula"', 'system-ui', 'sans-serif'],
        narrow: ['"PP Formula Narrow"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
