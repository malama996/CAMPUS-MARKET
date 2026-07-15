'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, BadgeCheck } from 'lucide-react';
import { api } from '../lib/api';

function formatZMW(amount) {
  return new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW', maximumFractionDigits: 0 }).format(amount);
}

export function ListingCard({ listing, onOpen }) {
  const [liked, setLiked] = useState(listing.viewerHasLiked || false);
  const [likeCount, setLikeCount] = useState(listing.like_count);
  const [burst, setBurst] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef(null);

  const images = listing.images?.length ? listing.images : [];

  useEffect(() => {
    if (images.length <= 1) return;
    if (!isHovering) return;

    intervalRef.current = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length);
    }, 1400);

    return () => clearInterval(intervalRef.current);
  }, [isHovering, images.length]);

  useEffect(() => {
    if (!isHovering) setActiveImage(0);
  }, [isHovering]);

  async function toggleLike(e) {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1)); // optimistic update
    setBurst(true);
    setTimeout(() => setBurst(false), 400);
    try {
      await (next ? api.like(listing.id) : api.unlike(listing.id));
    } catch {
      // revert on failure
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen?.(listing)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="glass rounded-card overflow-hidden cursor-pointer flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-surface overflow-hidden">
        {images.length > 0 ? (
          images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img + i}
              src={img}
              alt={listing.title}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                i === activeImage ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-sm">No photo</div>
        )}

        <div className="absolute left-3 top-3 h-1 w-10 bg-kente-stripe rounded-full opacity-90" />
        <div className="absolute right-3 bottom-3 px-2.5 py-1 rounded-full glass text-sm font-mono">
          {formatZMW(listing.price_zmw)}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 flex gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeImage ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <h3 className="font-display text-base leading-snug line-clamp-2">{listing.title}</h3>

        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="truncate">{listing.seller?.display_name}</span>
          {listing.seller?.is_seller_verified && <BadgeCheck size={14} className="text-accent shrink-0" />}
          <span>·</span>
          <span className="truncate">{listing.school}</span>
        </div>

        <div className="mt-auto flex items-center gap-4 pt-1">
          <button onClick={toggleLike} className="flex items-center gap-1 text-sm" aria-label="Like this listing">
            <Heart
              size={18}
              fill={liked ? 'currentColor' : 'none'}
              className={`transition-colors ${liked ? 'text-accent2' : 'text-muted'} ${burst ? 'animate-pulseLike' : ''}`}
            />
            <span className="tabular-nums">{likeCount}</span>
          </button>
          <div className="flex items-center gap-1 text-sm text-muted">
            <MessageCircle size={18} />
            <span className="tabular-nums">{listing.comment_count}</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}