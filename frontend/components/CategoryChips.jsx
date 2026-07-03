"use client";

import { motion } from 'framer-motion';
const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 1, label: 'Textbooks' },
  { id: 2, label: 'Fashion' },
  { id: 3, label: 'Food' },
  { id: 4, label: 'Electronics' },
  { id: 5, label: 'Services' },
  { id: 6, label: 'Room Essentials' },
  { id: 7, label: 'Other' },
];

export default function CategoryChips({ value, onChange }) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map(cat => {
        const isSelected = value === cat.id;
        return (
          <button
            key={cat.id || 'all'}
            onClick={() => onChange(cat.id)}
            className={`relative whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? 'text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="active-chip"
                className="absolute inset-0 bg-primary rounded-full -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
