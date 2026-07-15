"use client";

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useAuth } from '../lib/auth';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, profile, logout, loading } = useAuth();

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 text-xl font-bold tracking-tight text-primary">
              Campus Market
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
                <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
              </div>
            ) : user ? (
              <>
                <Link href="/listing/new" className="hidden sm:inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                  Post Listing
                </Link>
                <Link href="/chat" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Messages
                </Link>
                <Link href={`/profile/${user.id}`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  {profile?.username || 'Profile'}
                </Link>
                <Link
                  href="/settings/theme"
                  aria-label="Settings"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings size={20} />
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-destructive hover:text-destructive/80"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Log in
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}