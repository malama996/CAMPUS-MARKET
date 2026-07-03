import { supabaseAdmin } from '../config/supabase.js';

const FREE_TIER_LISTING_LIMIT = 5;

/**
 * Enforces the free-tier 5-active-listing cap.
 * Must be applied BEFORE the create-listing handler.
 * Premium tier users bypass this check (hook for future upgrade path).
 */
export async function enforceFreeListingCap(req, res, next) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('tier, active_listing_count')
      .eq('id', req.user.id)
      .single();

    if (error) return next(error);

    // Premium tier bypass (future SaaS upgrade hook)
    if (profile.tier === 'premium') return next();

    if ((profile.active_listing_count || 0) >= FREE_TIER_LISTING_LIMIT) {
      return res.status(403).json({
        error: 'Free tier limit reached',
        message: `You can have a maximum of ${FREE_TIER_LISTING_LIMIT} active listings on the free plan.`,
        code: 'FREE_TIER_LIMIT',
        limit: FREE_TIER_LISTING_LIMIT,
        current: profile.active_listing_count,
        upgradeUrl: '/upgrade',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Call after a successful listing creation to increment the counter */
export async function incrementListingCount(userId) {
  try {
    const { error } = await supabaseAdmin.rpc('increment_active_listing_count', { p_user_id: userId });
    if (error) {
      console.error('[freeTier] increment failed:', error.message);
    }
  } catch (err) {
    console.error('[freeTier] increment failed:', err.message);
  }
}

/** Call after a listing is deleted/removed to decrement the counter */
export async function decrementListingCount(userId) {
  try {
    const { error } = await supabaseAdmin.rpc('decrement_active_listing_count', { p_user_id: userId });
    if (error) {
      console.error('[freeTier] decrement failed:', error.message);
    }
  } catch (err) {
    console.error('[freeTier] decrement failed:', err.message);
  }
}
