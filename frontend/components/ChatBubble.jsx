"use client";

import { useAuth } from '../lib/auth';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';

export default function ChatBubble({ message }) {
  const { user } = useAuth();
  const isMine = user?.id === message.sender_id;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground border border-border rounded-bl-sm'}`}>
        <p className="text-sm break-words">{message.body}</p>
        <span className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] opacity-70">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMine && (
            message._sending ? (
              <Check size={13} className="opacity-50" />
            ) : (
              <CheckCheck
                size={13}
                className={message.is_read ? 'text-sky-400' : 'opacity-50'}
              />
            )
          )}
        </span>
      </div>
    </motion.div>
  );
}