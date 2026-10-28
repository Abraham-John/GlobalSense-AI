/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07070B',
          900: '#0D0D14',
          850: '#13131D',
          800: '#1A1A27',
        },
        surface: {
          DEFAULT: '#0F0F16',
          elevated: '#171722',
          card: 'rgba(23, 23, 34, 0.7)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.16)',
        },
        brand: {
          violet: '#6366f1',
          indigo: '#4f46e5',
          cyan: '#06b6d4',
          glow: 'rgba(99, 102, 241, 0.25)',
        },
        sentiment: {
          pos: '#10b981', // Accessible Green
          'pos-glow': 'rgba(16, 185, 129, 0.2)',
          neg: '#f43f5e', // Coral / Red
          'neg-glow': 'rgba(244, 63, 94, 0.2)',
          neu: '#64748b', // Blue-grey Slate
          'neu-glow': 'rgba(100, 116, 139, 0.2)',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans JP', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'monospace'],
        display: ['Plus Jakarta Sans', 'Geist', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
