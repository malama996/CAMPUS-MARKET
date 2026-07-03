'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ListingCard } from './ListingCard';
import { api } from '../lib/api';
import { subscribeToFeed } from '../lib/supabaseClient';

export function Feed({ school, onOpenListing }) {
  const [listings, setListings] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [pendingNew, setPendingNew] = useState([]);
  const sentinelRef = useRef(null);

  const loadPage = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const params = school ? { school } : {};
      if (cursor) params.cursor = cursor;
      const { listings: page, nextCursor } = await api.getFeed(params);
      setListings((prev) => [...prev, ...page]);
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hasMore, school]);

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll via IntersectionObserver — cheap, no scroll-event thrashing
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && !loading && loadPage(),
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadPage, loading]);

  // Realtime: new listings from this school appear as a "New posts" pill, not a jarring insert
  useEffect(() => {
    if (!school) return;
    return subscribeToFeed(school, (listing) => setPendingNew((p) => [listing, ...p]));
  }, [school]);

  function showNewPosts() {
    setListings((prev) => [...pendingNew, ...prev]);
    setPendingNew([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {pendingNew.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onClick={showNewPosts}
            className="sticky top-2 z-10 mx-auto flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm font-medium shadow-lg"
          >
            ↑ {pendingNew.length} new listing{pendingNew.length > 1 ? 's' : ''}
          </motion.button>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
        <AnimatePresence initial={false}>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onOpen={onOpenListing} />
          ))}
        </AnimatePresence>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card aspect-[4/3] bg-surface animate-pulse" />
          ))}
        </div>
      )}

      {!hasMore && listings.length === 0 && !loading && (
        <div className="text-center text-muted py-16 px-6">
          <p className="font-display text-lg mb-1">Nothing here yet</p>
          <p className="text-sm">Be the first to post something on your campus.</p>
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}
