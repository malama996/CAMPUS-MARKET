import { supabase } from './supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

async function fetchWithAuth(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  let data;
  try {
    if (response.status !== 204) {
      data = await response.json();
    }
  } catch (err) {
    console.error('Failed to parse JSON', err);
  }

  if (!response.ok) {
    return { error: data?.error || 'An error occurred', details: data?.details };
  }

  return { data };
}

export default {
  get: (url, options) => fetchWithAuth(url, { ...options, method: 'GET' }),
  post: (url, body, options) => fetchWithAuth(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (url, body, options) => fetchWithAuth(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url, options) => fetchWithAuth(url, { ...options, method: 'DELETE' }),
};
