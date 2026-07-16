"use client";

import { useState } from 'react';
import { Heart } from 'lucide-react';
import api from '../lib/api';

export default function LikeButton({ listingId, initialLiked = false, initialCount = 0 }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);

    // Optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    try {
      if (nextLiked) {
        await api.post(`/listings/${listingId}/like`);
      } else {
        await api.delete(`/listings/${listingId}/like`);
      }
    } catch (err) {
      // Roll back on failure
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike this listing' : 'Like this listing'}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
    >
      <Heart
        className={`h-4 w-4 transition-colors ${liked ? 'text-destructive' : 'text-muted-foreground'}`}
        fill={liked ? 'currentColor' : 'none'}
      />
      <span className={liked ? 'text-destructive' : 'text-muted-foreground'}>{count}</span>
    </button>
  );
}