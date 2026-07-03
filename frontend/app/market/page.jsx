"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import InstitutionFilter from '../../components/InstitutionFilter';
import CategoryChips from '../../components/CategoryChips';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function MarketPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [school, setSchool] = useState('');
  const [category, setCategory] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (school) query.append('school', school);
        if (category) query.append('category', category);

        const { data } = await api.get(`/listings/feed?${query.toString()}`);
        if (data?.listings) {
          setListings(data.listings);
          setNextCursor(data.nextCursor);
          setHasMore(!!data.nextCursor);
        } else {
          setListings([]);
          setHasMore(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [school, category]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const query = new URLSearchParams();
      if (school) query.append('school', school);
      if (category) query.append('category', category);
      query.append('cursor', nextCursor);

      const { data } = await api.get(`/listings/feed?${query.toString()}`);
      if (data?.listings) {
        setListings(prev => [...prev, ...data.listings]);
        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor, school, category]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <InstitutionFilter value={school} onChange={setSchool} />
        <Link 
          href="/search" 
          className="w-full sm:w-auto px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm text-left border border-border hover:bg-muted/80 transition-colors"
        >
          🔍 Search listings...
        </Link>
      </div>

      <CategoryChips value={category} onChange={setCategory} />

      {loading && listings.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="animate-pulse bg-card rounded-xl h-64 border border-border"></div>
          ))}
        </div>
      ) : listings.length > 0 ? (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
        >
          {listings.map(listing => (
            <motion.div key={listing.id} variants={item} layout>
              <Link href={`/listing/${listing.id}`} className="group flex flex-col h-full bg-card rounded-xl overflow-hidden border border-border shadow-sm transition-all hover:shadow-md hover:border-primary/50 hover:-translate-y-1 duration-300">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {listing.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">No Image</div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-medium text-foreground line-clamp-2 text-sm sm:text-base leading-tight mb-1">{listing.title}</h3>
                  <p className="text-primary font-bold text-lg mt-auto">ZMW {listing.price_zmw}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span className="truncate mr-2">{listing.school}</span>
                    <span className="shrink-0">{new Date(listing.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-card rounded-xl border border-border mt-6"
        >
          <p className="text-muted-foreground text-lg">No listings found for this criteria.</p>
          <button 
            onClick={() => { setSchool(''); setCategory(null); }}
            className="mt-4 text-primary font-medium hover:underline"
          >
            Clear filters
          </button>
        </motion.div>
      )}

      {/* Infinite Scroll Target */}
      {hasMore && !loading && (
        <div ref={observerTarget} className="py-8 flex justify-center w-full">
          {loadingMore && <div className="animate-pulse flex space-x-2 items-center text-muted-foreground"><div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div><div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div><div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div> Loading more...</div>}
        </div>
      )}
    </div>
  );
}
