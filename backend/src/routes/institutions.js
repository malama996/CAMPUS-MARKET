import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { redis } from '../config/redis.js';

export const institutionsRouter = Router();

const CACHE_KEY = 'institutions:copperbelt:v1';
const CACHE_TTL = 3600; // 1 hour — institutions rarely change

// GET /api/institutions
institutionsRouter.get('/', async (req, res, next) => {
  try {
    // Cache-first
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return res.json({ institutions: cached, cached: true });
    } catch (_) {}

    const { data, error } = await supabaseAdmin
      .from('institutions')
      .select('id, name, short_name, type, city, logo_url')
      .eq('province', 'Copperbelt')
      .order('name');

    if (error) throw error;

    redis.set(CACHE_KEY, data, { ex: CACHE_TTL }).catch(() => {});
    res.json({ institutions: data });
  } catch (err) {
    // Hard fallback: return static list if DB fails — system never breaks
    console.error('[institutions] DB error, returning static fallback:', err.message);
    res.json({ institutions: STATIC_COPPERBELT_INSTITUTIONS, cached: false, fallback: true });
  }
});

// Static fallback — mirrors the seeded data in schema.sql
const STATIC_COPPERBELT_INSTITUTIONS = [
  { id: 1, name: 'Copperbelt University', short_name: 'CBU', type: 'university', city: 'Kitwe' },
  { id: 2, name: 'Zambia University of Technology', short_name: 'ZUT', type: 'university', city: 'Kitwe' },
  { id: 3, name: 'Northrise University', short_name: 'NSU', type: 'university', city: 'Ndola' },
  { id: 4, name: 'Kitwe College of Education', short_name: 'KCE', type: 'college', city: 'Kitwe' },
  { id: 5, name: 'Ndola College of Education', short_name: 'NCE', type: 'college', city: 'Ndola' },
  { id: 6, name: 'Luanshya College of Education', short_name: 'LCE', type: 'college', city: 'Luanshya' },
  { id: 7, name: 'Mufulira College of Education', short_name: 'MCE', type: 'college', city: 'Mufulira' },
  { id: 8, name: 'Copperbelt Health Education Institute', short_name: 'CHEI', type: 'college', city: 'Ndola' },
  { id: 9, name: 'Nkana College', short_name: 'NKC', type: 'college', city: 'Kitwe' },
  { id: 10, name: 'Mindolo Ecumenical Foundation', short_name: 'MEF', type: 'college', city: 'Kitwe' },
  { id: 11, name: 'Copperbelt', short_name: 'CBelt', type: 'region', city: 'Copperbelt Province' },
];
