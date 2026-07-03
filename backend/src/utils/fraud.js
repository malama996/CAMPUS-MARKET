// fraud.js — Rule-based fraud detection. Never auto-removes; only flags for human review.

const PHONE_REGEX = /(?:\+?26)?0[7][0-9]{8}/g;
const PAYMENT_BYPASS_KEYWORDS = ['send me money', 'bank transfer', 'mtn money', 'zanaco', 'pay outside', 'whatsapp me', 'call me'];

// Category median prices (ZMW) — rough estimates for Copperbelt market
const CATEGORY_MEDIANS = { 1: 80, 2: 150, 3: 30, 4: 1200, 5: 100, 6: 200, 7: 100 };

export async function checkListingForFraud(listing) {
  const flags = [];
  const median = CATEGORY_MEDIANS[listing.category_id] ?? 100;

  // Rule 1: Price suspiciously below category median
  if (listing.price_zmw > 0 && listing.price_zmw < median * 0.3) {
    flags.push({ reason: `Price ZMW${listing.price_zmw} is >70% below category median ZMW${median}`, severity: 'medium' });
  }

  // Rule 2: Phone number in listing text (routing around in-app chat)
  const titleAndDesc = `${listing.title} ${listing.description}`;
  if (PHONE_REGEX.test(titleAndDesc)) {
    flags.push({ reason: 'Phone number detected in listing text — possible off-platform routing', severity: 'low' });
  }

  // Rule 3: Payment bypass keywords in description
  const descLower = (listing.description || '').toLowerCase();
  const found = PAYMENT_BYPASS_KEYWORDS.filter(kw => descLower.includes(kw));
  if (found.length) {
    flags.push({ reason: `Payment bypass language detected: ${found.join(', ')}`, severity: 'high' });
  }

  return flags;
}

export function flagSuspiciousMessage(body) {
  const lower = body.toLowerCase();
  if (PHONE_REGEX.test(body)) return true;
  if (PAYMENT_BYPASS_KEYWORDS.some(kw => lower.includes(kw))) return true;
  return false;
}
