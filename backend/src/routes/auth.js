import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

// ─── VALIDATION SCHEMAS ────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/i, 'Username: letters, numbers, _ and . only'),
  display_name: z.string().min(2).max(60),
  institution_id: z.number().int().positive(),
  role: z.enum(['user', 'seller']).default('user'),
  hostel: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const completeProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/i),
  display_name: z.string().min(2).max(60),
  school: z.string().min(2),
  hostel: z.string().optional().nullable(),
});

// Helper: robustly detect "email already exists" across Supabase's various error shapes.
// Supabase has changed this wording between versions, so we check multiple signals
// instead of relying on one exact substring.
//
// NOTE: we deliberately do NOT treat a bare `authError.status === 422` as
// "email already exists". Supabase returns 422 for several unrelated
// validation failures too (e.g. a rejected weak password), and matching on
// status alone was misreporting those as "an account with this email
// already exists" — which is both wrong and sends the user to try logging
// in with an account that was never created. Only match on the specific
// error codes/messages Supabase actually uses for a duplicate email.
function isEmailAlreadyExistsError(authError) {
  if (!authError) return false;
  const msg = (authError.message || '').toLowerCase();
  const code = authError.code || authError.error_code || '';

  return (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    (msg.includes('already') && (msg.includes('registered') || msg.includes('exists')))
  );
}

// ─── REGISTER ──────────────────────────────────────────────────────────────
// Rate limited: 5 registrations per hour per IP to prevent spam
authRouter.post(
  '/register',
  rateLimit({ windowSeconds: 3600, max: 5, keyPrefix: 'register' }),
  async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid registration data', details: parsed.error.flatten() });
      }

      const { email, password, username, display_name, institution_id, role, hostel } = parsed.data;

      // Resolve institution name from DB
      const { data: institution, error: instErr } = await supabaseAdmin
        .from('institutions')
        .select('name')
        .eq('id', institution_id)
        .single();

      if (instErr || !institution) {
        return res.status(400).json({ error: 'Invalid institution selected' });
      }

      // Create Supabase Auth user (handles bcrypt hashing internally)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm for MVP
      });

      if (authError) {
        if (isEmailAlreadyExistsError(authError)) {
          return res.status(409).json({ error: 'An account with this email already exists. Try logging in instead.' });
        }
        // Log the real error so it shows up in Render logs instead of being a mystery 500
        console.error('Supabase createUser error:', authError);
        throw authError;
      }

      // Create profile row
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          username,
          display_name,
          school: institution.name,
          institution_id,
          hostel: hostel || null,
          role,
          tier: 'free',
          active_listing_count: 0,
        })
        .select()
        .single();

      if (profileError) {
        // Roll back auth user if profile creation fails, so retrying doesn't hit
        // "email already exists" for a registration that never actually completed.
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});

        if (profileError.code === '23505') {
          return res.status(409).json({ error: 'Username already taken' });
        }
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      // Sign in immediately to get tokens
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error('Post-registration auto sign-in failed:', signInError);
        // Registration succeeded but auto-login failed — client should use /login
        return res.status(201).json({ profile, message: 'Account created. Please log in.' });
      }

      res.status(201).json({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── LOGIN ─────────────────────────────────────────────────────────────────
authRouter.post(
  '/login',
  rateLimit({ windowSeconds: 900, max: 10, keyPrefix: 'login' }),
  async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        // Only genuine bad-credential responses should show "Invalid email or password".
        // Anything else (timeouts, rate limits, Supabase outages) gets its own message
        // so users aren't told their correct password is wrong.
        const status = error.status || 400;

        if (status === 400 || status === 401) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.error('Login error (non-credential):', error);

        if (status === 429) {
          return res.status(429).json({ error: 'Too many attempts. Please wait a moment and try again.' });
        }

        return res.status(503).json({ error: 'Login is temporarily unavailable. Please try again in a moment.' });
      }

      // Fetch profile
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileErr) {
        console.error('Profile fetch error after login:', profileErr);
      }

      res.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── LOGOUT ────────────────────────────────────────────────────────────────
authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await supabaseAdmin.auth.admin.signOut(req.token);
    res.status(204).send();
  } catch (err) {
    // Logout should always succeed from client perspective
    res.status(204).send();
  }
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────
authRouter.delete('/me', requireAuth, async (req, res, next) => {
  try {
    // Deleting the profile cascades to the user's listings, chat threads,
    // chat messages, likes, saved_listings, comments, follows, and reports
    // (all FKs to profiles.id are ON DELETE CASCADE). Note this means a
    // shared chat_thread is removed entirely — for BOTH participants — the
    // moment either one deletes their account, since buyer_id/seller_id
    // both cascade. If that's not the desired behavior long-term, revisit
    // those FK rules (e.g. SET NULL + a "Deleted User" placeholder in the
    // UI) rather than patching around it here.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', req.user.id);

    if (profileError) {
      // Do NOT proceed to delete the auth user if this failed — that would
      // leave an orphaned profile with no way to log back in and finish
      // deleting it. Surface the error instead of silently continuing.
      console.error('Account deletion — profile delete failed:', profileError);
      throw profileError;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    if (authError) {
      // Profile is already gone at this point but the auth user survived.
      // Log loudly — this needs manual cleanup (an orphaned auth.users row
      // with no matching profile) rather than silently succeeding.
      console.error('Account deletion — auth user delete failed after profile was removed:', authError);
      throw authError;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── REFRESH TOKEN ─────────────────────────────────────────────────────────
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET CURRENT USER ──────────────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

// ─── COMPLETE PROFILE (post-OAuth) ─────────────────────────────────────────
authRouter.post('/complete-profile', requireAuth, async (req, res, next) => {
  try {
    const parsed = completeProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid profile payload', details: parsed.error.flatten() });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: req.user.id, ...parsed.data }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username already taken' });
      throw error;
    }
    res.status(201).json({ profile: data });
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE THEME ──────────────────────────────────────────────────────────
authRouter.patch('/me/theme', requireAuth, async (req, res, next) => {
  try {
    const theme = z.enum(['light', 'dark', 'neon', 'afro-tech']).parse(req.body.theme);
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ theme })
      .eq('id', req.user.id)
      .select('theme')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: 'Invalid theme' });
  }
});