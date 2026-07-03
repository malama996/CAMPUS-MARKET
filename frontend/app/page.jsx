"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const marketBackground = {
  backgroundImage: 'linear-gradient(rgba(10, 10, 20, 0.58), rgba(10, 10, 20, 0.72)), url(/assets/images/market-bg.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

export default function LandingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const { data } = await api.get('/listings/feed?limit=8');
        if (data?.listings) {
          setRecentListings(data.listings.slice(0, 8)); // Grab up to 8
        }
      } catch (err) {
        console.error('Failed to fetch recent listings', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, []);

  if (authLoading) {
    return (
      <div className="space-y-8">
        <section className="rounded-3xl border border-border bg-card/80 p-6 sm:p-8 shadow-sm" style={marketBackground}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-10 w-3/4 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2 pt-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (user) {
    return (
      <div className="space-y-8">
        <section className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden" style={marketBackground}>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] p-6 sm:p-8 text-white">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Authenticated dashboard
              </div>
              <div>
                <p className="text-sm text-white/80">Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}</p>
                <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                  Your market, your activity, your account.
                </h1>
                <p className="mt-4 max-w-2xl text-white/80 text-base sm:text-lg">
                  This is your working dashboard. Jump straight into posting, messaging, or managing your profile without the marketing landing page in the way.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/listing/new" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                  New Listing
                </Link>
                <Link href="/chat" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                  Messages
                </Link>
                <Link href={`/profile/${user.id}`} className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                  Manage Account
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
                <p className="text-sm text-white/70">Institution</p>
                <p className="mt-2 text-lg font-semibold text-white">{profile?.school || 'Not set'}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
                <p className="text-sm text-white/70">Account tier</p>
                <p className="mt-2 text-lg font-semibold text-white">{profile?.tier || 'free'}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
                <p className="text-sm text-white/70">Role</p>
                <p className="mt-2 text-lg font-semibold text-white">{profile?.role || 'user'}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
                <p className="text-sm text-white/70">Active listings</p>
                <p className="mt-2 text-lg font-semibold text-white">{profile?.active_listing_count ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Quick actions</h2>
                <p className="text-muted-foreground mt-1">The next actions most users need after sign-in.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Link href="/listing/new" className="rounded-2xl border border-border bg-background p-4 hover:border-primary/50 transition-colors">
                <div className="text-sm text-muted-foreground">Sell something</div>
                <div className="mt-1 font-semibold text-foreground">Post listing</div>
              </Link>
              <Link href="/market" className="rounded-2xl border border-border bg-background p-4 hover:border-primary/50 transition-colors">
                <div className="text-sm text-muted-foreground">Browse the feed</div>
                <div className="mt-1 font-semibold text-foreground">Market</div>
              </Link>
              <Link href={`/profile/${user.id}`} className="rounded-2xl border border-border bg-background p-4 hover:border-primary/50 transition-colors">
                <div className="text-sm text-muted-foreground">Update account</div>
                <div className="mt-1 font-semibold text-foreground">Profile</div>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight">Recent listings</h2>
            <p className="text-muted-foreground mt-1 mb-5">A small view of what is active across the network.</p>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 rounded-xl bg-muted" />
                ))}
              </div>
            ) : recentListings.length > 0 ? (
              <div className="space-y-3">
                {recentListings.slice(0, 3).map((listing) => (
                  <Link key={listing.id} href={`/listing/${listing.id}`} className="block rounded-xl border border-border bg-background p-4 hover:border-primary/50 transition-colors">
                    <div className="font-medium text-foreground line-clamp-1">{listing.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between gap-3">
                      <span>{listing.school}</span>
                      <span>ZMW {listing.price_zmw}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
                No listings loaded yet.
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden" style={marketBackground}>
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative z-10">
      {/* Hero Section */}
      <motion.section 
        initial="hidden" 
        animate="visible" 
        variants={staggerContainer}
        className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 py-20"
      >
        <motion.h1 variants={fadeUp} className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          The Marketplace for <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-emerald-300">
            Copperbelt Institutions
          </span>
        </motion.h1>
        
        <motion.p variants={fadeUp} className="mt-4 text-xl text-white/80 max-w-2xl mx-auto mb-10">
          Buy, sell, and connect exclusively within CBU, TEVET, ZUT, and more. Trust-driven, free to start, and tailored for you.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/market" 
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:scale-105 active:scale-95 duration-200"
          >
            Browse Market
          </Link>
          {!user && (
            <Link 
              href="/register" 
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:scale-105 active:scale-95 duration-200"
            >
              Create Free Account
            </Link>
          )}
          {user && (
            <Link 
              href="/listing/new" 
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:scale-105 active:scale-95 duration-200"
            >
              Post a Listing
            </Link>
          )}
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30 border-y border-border overflow-hidden">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-4"
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold">Why Campus Market?</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">Designed specifically for the needs of students and locals in the Copperbelt region.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <motion.div variants={fadeUp} whileHover={{ y: -5 }} className="bg-card p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <span className="text-primary text-2xl">🎓</span>
              </div>
              <h3 className="font-bold text-xl mb-3">Student & Local Focused</h3>
              <p className="text-muted-foreground">Restricted to verified institutions like CBU and TEVET. Trade with people you can trust in your local community.</p>
            </motion.div>
            <motion.div variants={fadeUp} whileHover={{ y: -5 }} className="bg-card p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <span className="text-primary text-2xl">🛡️</span>
              </div>
              <h3 className="font-bold text-xl mb-3">Safe & Trusted</h3>
              <p className="text-muted-foreground">Built-in fraud detection algorithms and secure in-app messaging protect your trades and keep scammers away.</p>
            </motion.div>
            <motion.div variants={fadeUp} whileHover={{ y: -5 }} className="bg-card p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <span className="text-primary text-2xl">⚡</span>
              </div>
              <h3 className="font-bold text-xl mb-3">Fast & Free</h3>
              <p className="text-muted-foreground">Post up to 5 active listings entirely for free. Our AI similarity engine helps buyers find exactly what you are selling.</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Recent Listings Preview */}
      <section className="py-24 max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Fresh on Campus</h2>
            <p className="text-muted-foreground mt-2">The latest items listed across Copperbelt institutions.</p>
          </div>
          <Link href="/market" className="text-primary font-medium hover:underline hidden sm:block">
            View all listings &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-64 border border-border"></div>
            ))}
          </div>
        ) : recentListings.length > 0 ? (
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {recentListings.map(listing => (
              <motion.div key={listing.id} variants={fadeUp}>
                <Link href={`/listing/${listing.id}`} className="group flex flex-col h-full bg-card rounded-xl overflow-hidden border border-border shadow-sm transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 duration-300">
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {listing.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">No Image</div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-medium text-foreground line-clamp-2 text-sm sm:text-base leading-tight mb-1">{listing.title}</h3>
                    <p className="text-primary font-bold text-lg mt-auto">ZMW {listing.price_zmw}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span className="truncate mr-2">{listing.school}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground mb-4">No listings yet. Be the first to sell something!</p>
            <Link href="/listing/new" className="text-primary font-medium hover:underline">
              Post a listing
            </Link>
          </div>
        )}
        
        <div className="mt-8 text-center sm:hidden">
          <Link href="/market" className="text-primary font-medium hover:underline">
            View all listings &rarr;
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, type: "spring" }}
        className="py-24 bg-primary text-primary-foreground text-center px-4 rounded-3xl mx-4 mb-10 shadow-lg"
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to start trading?</h2>
        <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-lg">
          Join thousands of students and local sellers in the Copperbelt region today.
        </p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link 
            href={user ? "/listing/new" : "/register"} 
            className="inline-flex h-12 items-center justify-center rounded-md bg-background text-foreground px-10 text-base font-bold shadow-sm transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            {user ? 'Post Your First Item' : 'Create Free Account'}
          </Link>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border py-12 text-center text-muted-foreground bg-card">
        <p>&copy; 2026 Campus Market. All rights reserved.</p>
        <p className="text-sm mt-2">Built for the Copperbelt Province.</p>
        <p className="text-sm mt-4 font-semibold text-foreground">Developed by ZhenchStack</p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/policies" className="hover:text-primary transition-colors">Privacy Policies</Link>
        </div>
      </footer>
      </div>
    </div>
  );
}
