"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import api from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';

export default function ProfilePage({ params }) {
  const { user, profile: currentUserProfile, logout, deleteAccount } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  const isOwner = user?.id === params.id;

  useEffect(() => {
    async function load() {
      // For MVP, we just use the current user's profile if it's them.
      // If we wanted to view others, we'd need a public profile endpoint.
      if (isOwner && currentUserProfile) {
        setProfile(currentUserProfile);
        setLoading(false);
      } else {
        // Fallback or external profile fetch (stubbed for now since auth.js /me exists)
        setLoading(false);
      }
    }
    load();
  }, [params.id, isOwner, currentUserProfile]);

  const confirmDeleteAccount = async () => {
    try {
      setDeleting(true);
      await deleteAccount();
      router.replace('/');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-card rounded-xl"></div>;
  if (!profile && !isOwner) return <div className="text-center py-20">Profile viewing not fully implemented for non-owners yet.</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-4xl">
            {profile?.display_name?.charAt(0) || 'U'}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-bold">{profile?.display_name}</h1>
            <p className="text-muted-foreground mt-1">@{profile?.username}</p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4 text-sm">
              <span className="bg-muted px-3 py-1 rounded-full">{profile?.school}</span>
              <span className="bg-muted px-3 py-1 rounded-full">{profile?.role}</span>
              <span className="bg-muted px-3 py-1 rounded-full border border-primary/30 text-primary">{profile?.tier} tier</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="mt-10 pt-6 border-t border-border flex flex-col gap-4">
            <h3 className="font-semibold text-lg">Account Actions</h3>
            <button
              onClick={logout}
              className="w-full sm:w-auto px-6 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-md hover:bg-destructive/20 transition-colors self-start font-medium"
            >
              Log Out
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="w-full sm:w-auto px-6 py-2 bg-background text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors self-start font-medium disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete your account permanently?"
        description="This cannot be undone. Your profile, listings, and messages will be permanently removed."
        confirmLabel="Delete account"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}