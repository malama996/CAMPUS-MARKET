"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

export default function CommentSection({ listingId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/listings/${listingId}/comments`);
        if (data?.comments) setComments(data.comments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [listingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = body.trim();
    if (!trimmed) return;

    setPosting(true);
    try {
      const { data } = await api.post(`/listings/${listingId}/comments`, { body: trimmed });
      if (data?.comment) {
        setComments((prev) => [...prev, data.comment]);
        setBody('');
      }
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-lg font-semibold mb-4">
        Comments {comments.length > 0 && <span className="text-muted-foreground font-normal">({comments.length})</span>}
      </h3>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 rounded-md bg-muted animate-pulse" />
          <div className="h-12 rounded-md bg-muted animate-pulse" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to ask a question.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {c.user?.display_name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium text-foreground">{c.user?.display_name || 'Unknown'}</span>{' '}
                  <span className="text-muted-foreground">
                    · {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </p>
                <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {user ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ask a question or leave a comment..."
              maxLength={500}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={posting || !body.trim()}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={`/login?redirect=/listing/${listingId}`} className="text-primary hover:underline font-medium">
              Log in
            </Link>{' '}
            to leave a comment.
          </p>
        )}
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}