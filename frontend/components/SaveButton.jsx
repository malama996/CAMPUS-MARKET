"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function SaveButton({ listingId, initialSaved }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const toggleSave = async (e) => {
    e.preventDefault(); // prevent navigation if inside a link
    if (loading) return;
    setLoading(true);

    try {
      if (saved) {
        await api.delete(`/listings/${listingId}/save`);
        setSaved(false);
      } else {
        await api.post(`/listings/${listingId}/save`);
        setSaved(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      onClick={toggleSave}
      disabled={loading}
      whileTap={{ scale: 0.8 }}
      className={`p-2 rounded-full transition-colors ${saved ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
      aria-label={saved ? "Unsave" : "Save"}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </motion.button>
  );
}
