import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')!;
const SERVICE_ACCOUNT_JSON = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!;

async function getAccessToken() {
  const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

Deno.serve(async (req) => {
  const { record } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('fcm_token')
    .eq('user_id', record.receiver_id)
    .single();

  if (!tokenRow) return new Response('No token found', { status: 200 });

  const accessToken = await getAccessToken();

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: tokenRow.fcm_token,
          notification: {
            title: 'New message',
            body: record.content?.slice(0, 80) ?? '',
          },
          data: {
            url: `/chat/${record.conversation_id}`,
          },
        },
      }),
    }
  );

  const result = await res.text();
  return new Response(result, { status: res.status });
});