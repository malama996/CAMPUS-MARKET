/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
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
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      backgroundImage: {
        'kente-stripe':
          'repeating-linear-gradient(100deg, rgb(var(--color-accent)) 0 6px, rgb(var(--color-accent-2)) 6px 12px, transparent 12px 18px)',
      },
      keyframes: {
        floatUp: { '0%': { transform: 'translateY(6px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        pulseLike: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.35)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        floatUp: 'floatUp 0.35s ease-out both',
        pulseLike: 'pulseLike 0.4s ease-in-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};