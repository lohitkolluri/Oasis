import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
          5: 'var(--surface-5)',
        },
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        neon: {
          cyan: 'var(--neon-cyan)',
          violet: 'var(--neon-violet)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(125, 211, 252, 0.25)',
        'neon-violet': '0 0 20px rgba(167, 139, 250, 0.25)',
        'neon-cyan-sm': '0 0 8px rgba(125, 211, 252, 0.2)',
        'neon-violet-sm': '0 0 8px rgba(167, 139, 250, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.3s ease both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'violet-pulse': 'violet-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
