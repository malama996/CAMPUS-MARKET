"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../lib/api';

export default function SimilarListings({ listingId }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/listings/${listingId}/similar`);
        if (data?.similar) {
          setListings(data.similar);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [listingId]);

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-md mt-6" />;
  if (listings.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-4">Similar Listings</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {listings.map(listing => (
          <Link key={listing.id} href={`/listing/${listing.id}`} className="block group">
            <div className="bg-card rounded-md overflow-hidden border border-border transition-colors hover:border-primary/50">
              <div className="aspect-square bg-muted relative">
                {listing.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">No Image</div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{listing.title}</h3>
                <p className="text-primary font-bold text-sm mt-1">ZMW {listing.price_zmw}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
