"use client";

import { useAuth } from '../lib/auth';

export default function FreeTierBanner() {
  const { profile } = useAuth();

  if (!profile || profile.tier !== 'free') return null;

  const used = profile.active_listing_count || 0;
  const limit = 5;
  const percent = Math.min((used / limit) * 100, 100);

  return (
    <div className="bg-muted p-4 rounded-lg border border-border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Free Tier Status</h3>
        <span className="text-xs text-muted-foreground">{used} / {limit} listings</span>
      </div>
      <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full ${percent >= 100 ? 'bg-destructive' : percent > 80 ? 'bg-orange-500' : 'bg-primary'}`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      {percent >= 100 && (
        <p className="text-xs text-destructive mt-2 font-medium">You have reached the free tier limit.</p>
      )}
    </div>
  );
}
