'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTheme, THEMES } from './ThemeProvider';

const SWATCH = {
  light: ['#F7F2E9', '#C4822E'],
  dark: ['#0D0D14', '#2EB0A3'],
  neon: ['#0A0814', '#E83875'],
  'afro-tech': ['#12100E', '#D4A24E'],
};

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4">
      <h2 className="font-display text-lg mb-1">Theme</h2>
      <p className="text-sm text-muted mb-4">Pick a look. It syncs across your devices.</p>

      <div className="grid grid-cols-2 gap-3">
        {THEMES.map(({ id, label }) => {
          const [bg, accent] = SWATCH[id];
          const active = theme === id;
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTheme(id)}
              className={`relative rounded-card p-4 text-left border-2 transition-colors ${
                active ? 'border-accent' : 'border-transparent'
              }`}
              style={{ background: bg }}
            >
              <div className="h-1.5 w-8 rounded-full mb-3" style={{ background: accent }} />
              <span className="font-display text-sm" style={{ color: id === 'light' ? '#1A1612' : '#F5EEE2' }}>
                {label}
              </span>
              {active && (
                <span className="absolute top-3 right-3 rounded-full bg-accent p-1">
                  <Check size={12} className="text-surface" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
