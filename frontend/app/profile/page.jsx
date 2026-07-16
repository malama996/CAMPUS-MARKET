"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

// Generic "my profile" alias. Lets the rest of the app (nav bars, links,
// post-login redirects) point at a fixed /profile path without needing to
// know the current user's id in advance.
export default function MyProfileRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // wait for auth state to resolve before deciding

    if (user) {
      router.replace(`/profile/${user.id}`);
    } else {
      router.replace('/login?redirect=/profile');
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
    </div>
  );
}