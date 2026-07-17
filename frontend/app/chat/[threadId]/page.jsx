"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import api from '../../../lib/api';
import ChatBubble from '../../../components/ChatBubble';
import { supabase } from '../../../lib/supabaseClient';
import ConfirmDialog from '../../../components/ConfirmDialog';

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [thread, setThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/chat/threads/${params.threadId}`);
        if (data?.thread) {
          setThread(data.thread);
          const { data: messageData } = await api.get(`/chat/threads/${params.threadId}/messages`);
          if (messageData?.messages) {
            setMessages(messageData.messages);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.threadId]);

  // Scroll to bottom whenever the message list changes (initial load,
  // sent message, or an incoming realtime message).
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription — only (re)created when the thread changes, not on
  // every new message. Kept in its own effect so it isn't torn down and
  // rebuilt on each render.
  useEffect(() => {
    const channel = supabase
      .channel(`thread:${params.threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${params.threadId}`,
      }, (payload) => {
        // Dedupe against messages already added via the direct API response
        // in handleSend — otherwise the sender sees their own message twice
        // (once from the POST response, once from this realtime event).
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.threadId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const msg = newMessage;
      setNewMessage(''); // optimistic clear

      const { data } = await api.post(`/chat/threads/${params.threadId}/messages`, { body: msg });

      // Dedupe here too, in case the realtime event arrives before this
      // response resolves.
      if (data?.message) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      alert('Failed to send message');
    }
  };

  const confirmDeleteThread = async () => {
    try {
      setDeleting(true);
      await api.delete(`/chat/threads/${params.threadId}`);
      router.push('/chat');
    } catch (err) {
      alert('Failed to delete conversation');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) return <div className="animate-pulse bg-card rounded-xl h-[80vh]"></div>;

  return (
    <div className="max-w-3xl mx-auto h-[80vh] flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
            {thread?.partner?.display_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground truncate">{thread?.partner?.display_name}</h2>
            {thread?.listing && (
              <p className="text-xs text-muted-foreground truncate">Listing: {thread.listing.title}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          className="shrink-0 h-8 px-3 inline-flex items-center justify-center rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete conversation'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-input bg-muted/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="rounded-full bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this conversation?"
        description="It will be removed from your inbox. The other person will still see their side unless they delete it too."
        confirmLabel="Delete"
        onConfirm={confirmDeleteThread}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}