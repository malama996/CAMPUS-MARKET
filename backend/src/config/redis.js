import { Redis } from '@upstash/redis';

// Upstash Redis (REST-based, works fine on serverless/free-tier hosts with no persistent TCP conn)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const CACHE_TTL_SECONDS = {
  feedPage: 60,
  storefront: 120,
};
