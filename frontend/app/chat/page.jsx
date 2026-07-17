"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ChatListPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  // The thread currently pending delete confirmation, or null
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/chat/threads');
        if (data?.threads) setThreads(data.threads);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  const handleRequestDelete = (e, threadId) => {
    // Prevent the click from also triggering the <Link> navigation
    e.preventDefault();
    e.stopPropagation();
    setPendingDeleteId(threadId);
  };

  const confirmDeleteThread = async () => {
    const threadId = pendingDeleteId;
    if (!threadId) return;

    try {
      setDeletingId(threadId);
      await api.delete(`/chat/threads/${threadId}`);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch (err) {
      alert('Failed to delete conversation');
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  if (!user) return null;
  if (loading) return <div className="animate-pulse bg-card rounded-xl h-64 border border-border"></div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {threads.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">You have no messages yet.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border shadow-sm">
          {threads.map(thread => {
            const partner = thread.buyer_id === user.id ? thread.seller : thread.buyer;
            const isDeleting = deletingId === thread.id;
            return (
              <Link key={thread.id} href={`/chat/${thread.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                <div className="flex justify-between items-start flex-1 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                      {partner?.display_name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{partner?.display_name}</p>
                      {thread.listing && (
                        <p className="text-xs text-primary truncate max-w-[200px] sm:max-w-xs">
                          Re: {thread.listing.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(thread.last_message_at).toLocaleDateString()}
                  </span>
                </div>

                <button
                  onClick={(e) => handleRequestDelete(e, thread.id)}
                  disabled={isDeleting}
                  aria-label="Delete conversation"
                  title="Delete conversation"
                  className="ml-3 shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this conversation?"
        description="It will be removed from your inbox. The other person will still see their side unless they delete it too."
        confirmLabel="Delete"
        onConfirm={confirmDeleteThread}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}