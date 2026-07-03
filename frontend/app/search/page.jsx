"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function search() {
      if (!q || q.length < 2) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/listings/search?q=${encodeURIComponent(q)}`);
        if (data?.listings) setResults(data.listings);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [q]);

  if (!q) return <div className="text-center py-10 text-muted-foreground">Enter a search term to begin.</div>;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">Results for &quot;{q}&quot;</h2>
      
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-card rounded-xl h-64 border border-border"></div>)}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {results.map(listing => (
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
      ) : (
        <div className="text-center py-10 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">No listings found for &quot;{q}&quot;.</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="max-w-5xl mx-auto py-8">
      <form action="/search" method="GET" className="flex gap-2">
        <input 
          type="text" 
          name="q" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for textbooks, laptops, fashion..." 
          className="flex-1 rounded-md border border-input bg-card px-4 py-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <button type="submit" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors">
          Search
        </button>
      </form>

      <Suspense fallback={<div className="animate-pulse h-20 bg-muted mt-6 rounded-md"></div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
