"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import SaveButton from '../../../components/SaveButton';
import LikeButton from '../../../components/LikeButton';
import CommentSection from '../../../components/CommentSection';
import SimilarListings from '../../../components/SimilarListings';
import ImageGallery from '../../../components/ImageGallery';
import ConfirmDialog from '../../../components/ConfirmDialog';

export default function ListingDetailPage({ params }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Tracks which confirmation dialog is open: null | 'remove' | 'permanent'
  const [confirmAction, setConfirmAction] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/listings/${params.id}`);
        if (data?.listing) setListing(data.listing);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  const isOwner = user?.id === listing?.seller_id;

  const handleContact = async () => {
    if (!user) return router.push(`/login?redirect=/listing/${params.id}`);
    try {
      const { data } = await api.post('/chat/threads', { listing_id: listing.id });
      if (data?.thread) {
        router.push(`/chat/${data.thread.id}`);
      }
    } catch (err) {
      alert('Failed to start chat');
    }
  };

  // Soft delete — hides the listing from the market, but it can be restored.
  const confirmRemoveFromMarket = async () => {
    try {
      setDeleting(true);
      await api.delete(`/listings/${listing.id}`);
      router.push('/market');
    } catch (err) {
      alert('Failed to remove listing');
    } finally {
      setDeleting(false);
      setConfirmAction(null);
    }
  };

  // Hard delete — permanently removes the listing and cannot be undone.
  const confirmDeletePermanently = async () => {
    try {
      setDeleting(true);
      await api.delete(`/listings/${listing.id}/permanent`);
      router.push('/market');
    } catch (err) {
      alert('Failed to delete listing');
    } finally {
      setDeleting(false);
      setConfirmAction(null);
    }
  };

  if (loading) return <div className="animate-pulse bg-card rounded-xl h-[60vh]"></div>;
  if (!listing) return <div className="text-center py-20 text-xl font-bold">Listing not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm">
        <ImageGallery images={listing.images || []} title={listing.title} />

        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{listing.title}</h1>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <span>{listing.school}</span>
                <span>•</span>
                <span>{new Date(listing.created_at).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-2xl sm:text-3xl font-extrabold text-primary">ZMW {listing.price_zmw}</span>
              <div className="flex items-center gap-2">
                <LikeButton
                  listingId={listing.id}
                  initialLiked={listing.viewerHasLiked}
                  initialCount={listing.like_count}
                />
                {user && <SaveButton listingId={listing.id} initialSaved={listing.viewerHasSaved} />}
              </div>

              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    disabled={deleting}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 px-4 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {deleting ? 'Working...' : 'Delete'}
                  </button>

                  {menuOpen && !deleting && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => { setMenuOpen(false); setConfirmAction('remove'); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted"
                      >
                        Remove from Market
                        <span className="block text-xs text-muted-foreground">Hides it, can be restored</span>
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setConfirmAction('permanent'); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 border-t border-border"
                      >
                        Delete Permanently
                        <span className="block text-xs text-destructive/70">Cannot be undone</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="whitespace-pre-wrap text-muted-foreground">{listing.description}</p>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-6 justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                {listing.seller?.display_name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-semibold text-foreground">{listing.seller?.display_name}</p>
                <p className="text-xs text-muted-foreground">@{listing.seller?.username}</p>
              </div>
            </div>

            {user?.id !== listing.seller_id && (
              <button
                onClick={handleContact}
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Message Seller
              </button>
            )}
          </div>

          <CommentSection listingId={listing.id} />
        </div>
      </div>

      <SimilarListings listingId={listing.id} />

      <ConfirmDialog
        open={confirmAction === 'remove'}
        title="Remove this listing from the market?"
        description="Buyers will no longer see it. You can restore it later if needed."
        confirmLabel="Remove"
        onConfirm={confirmRemoveFromMarket}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'permanent'}
        title="Permanently delete this listing?"
        description="This cannot be undone. The listing and all related likes, saves, and comments will be gone for good."
        confirmLabel="Delete permanently"
        onConfirm={confirmDeletePermanently}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}