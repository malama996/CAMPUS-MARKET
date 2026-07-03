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
        if (authError.message.includes('already registered')) {
          return res.status(409).json({ error: 'An account with this email already exists' });
        }
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
        // Roll back auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
        if (profileError.code === '23505') {
          return res.status(409).json({ error: 'Username already taken' });
        }
        throw profileError;
      }

      // Sign in immediately to get tokens
      const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      // For MVP: sign in directly
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
      if (signInError) {
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
        // Deliberately vague — don't reveal which field is wrong
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Fetch profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

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
    await supabaseAdmin.from('profiles').delete().eq('id', req.user.id).catch(() => {});
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    if (error) throw error;

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
