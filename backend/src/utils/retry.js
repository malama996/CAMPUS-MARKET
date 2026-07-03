/**
 * Exponential backoff retry with jitter.
 * Never throws if fallback is provided.
 */
export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 300, fallback = null } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
      console.warn(`[retry] attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, err.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  if (fallback !== null) {
    console.warn(`[retry] all ${maxAttempts} attempts failed, using fallback`);
    return typeof fallback === 'function' ? fallback(lastError) : fallback;
  }
  throw lastError;
}
