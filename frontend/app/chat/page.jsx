"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';

export default function ChatListPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
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
            return (
              <Link key={thread.id} href={`/chat/${thread.id}`} className="block p-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {partner?.display_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold">{partner?.display_name}</p>
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
