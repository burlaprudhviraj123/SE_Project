import tailwindcssAnimate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Lora', 'Source Serif 4', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        ink: {
          DEFAULT: '#1C2024',
          muted: '#5A6065',
          faint: '#8C9298',
        },
        paper: {
          DEFAULT: '#FAF9F6',
          light: '#FFFFFF',
          dark: '#F2EFEB',
        },
        line: {
          DEFAULT: '#E4E0D8',
          subtle: '#EDEAE4',
        },
        accent: {
          DEFAULT: '#2B5D4F',
          hover: '#234C40',
          dim: '#DCE8E2',
          subtle: '#EEF4F0',
          foreground: '#FFFFFF',
        },
        status: {
          pending: '#B8862E',
          progress: '#2B5D4F',
          resolved: '#3F6B4A',
          rejected: '#9B4A3F',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)'
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)'
        }
      }
    },
  },
  plugins: [tailwindcssAnimate],
}
