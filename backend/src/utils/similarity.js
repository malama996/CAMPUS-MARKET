import { CircuitBreaker } from './circuitBreaker.js';
import { withRetry } from './retry.js';

const aiBreaker = new CircuitBreaker({ name: 'AI-similarity', failureThreshold: 3, timeout: 20000 });

/**
 * Returns up to `limit` listings similar to `target`.
 * PRIMARY: AI embeddings (OpenAI-compatible API)
 * FALLBACK (MANDATORY): keyword + category scoring — system NEVER fails without results.
 */
export async function getSimilarListings(target, candidateListings, limit = 6) {
  // Always have the keyword fallback ready
  const fallbackResults = keywordSimilarity(target, candidateListings, limit);

  if (!process.env.AI_SERVICE_KEY || aiBreaker.isOpen) {
    return { results: fallbackResults, source: 'fallback-keyword' };
  }

  try {
    const results = await withRetry(
      () => aiBreaker.fire(() => fetchAISimilarity(target, candidateListings, limit)),
      { maxAttempts: 2, baseDelayMs: 200 }
    );
    return { results, source: 'ai' };
  } catch (err) {
    console.warn('[similarity] AI failed, using keyword fallback:', err.message);
    return { results: fallbackResults, source: 'fallback-keyword' };
  }
}

async function fetchAISimilarity(target, candidates, limit) {
  const AI_URL = process.env.AI_SERVICE_URL || 'https://api.openai.com/v1/embeddings';
  const texts = [target.title + ' ' + target.description, ...candidates.map(c => c.title + ' ' + c.description)];

  const resp = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.AI_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
  const { data } = await resp.json();
  const targetVec = data[0].embedding;

  const scored = candidates.map((c, i) => ({
    ...c,
    _score: cosineSim(targetVec, data[i + 1].embedding),
  })).sort((a, b) => b._score - a._score).slice(0, limit);

  return scored;
}

// TF-IDF-lite keyword scorer — works with zero external deps
function keywordSimilarity(target, candidates, limit) {
  const sameCategory = candidates.filter(c => c.category_id === target.category_id && c.id !== target.id);
  const others = candidates.filter(c => c.category_id !== target.category_id && c.id !== target.id);

  const targetTokens = tokenize(target.title + ' ' + target.description);

  function score(listing) {
    const tokens = tokenize(listing.title + ' ' + listing.description);
    const shared = targetTokens.filter(t => tokens.includes(t)).length;
    const catBonus = listing.category_id === target.category_id ? 3 : 0;
    return shared + catBonus;
  }

  return [...sameCategory, ...others]
    .map(c => ({ ...c, _score: score(c) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

function cosineSim(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-9);
}
