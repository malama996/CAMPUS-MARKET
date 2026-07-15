'use client';

import { useState } from 'react';
import { ThemeCustomizer } from '../../../components/ThemeCustomizer';
import { requestNotificationPermission } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { Bell, BellOff, Check } from 'lucide-react';

export default function ThemeSettingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | enabling | enabled | denied | unsupported

  const handleEnableNotifications = async () => {
    setStatus('enabling');
    try {
      const token = await requestNotificationPermission(user.id, supabase);
      setStatus(token ? 'enabled' : 'denied');
    } catch (err) {
      console.error('Notification setup failed:', err);
      setStatus('unsupported');
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen p-4 space-y-8">
      <ThemeCustomizer />

      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Get notified instantly when you receive a new chat message.
        </p>

        <button
          onClick={handleEnableNotifications}
          disabled={status === 'enabling' || status === 'enabled'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'enabled' ? (
            <>
              <Check size={18} className="text-green-500" />
              Notifications enabled
            </>
          ) : status === 'enabling' ? (
            <>
              <Bell size={18} className="animate-pulse" />
              Enabling...
            </>
          ) : (
            <>
              <Bell size={18} />
              Enable message notifications
            </>
          )}
        </button>

        {status === 'denied' && (
          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
            <BellOff size={16} />
            Permission denied. Enable notifications for this site in your browser settings.
          </p>
        )}

        {status === 'unsupported' && (
          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
            <BellOff size={16} />
            Notifications aren't supported on this browser/device.
          </p>
        )}
      </section>
    </main>
  );
}