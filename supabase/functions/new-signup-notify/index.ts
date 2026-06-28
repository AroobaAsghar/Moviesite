import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'CineVerse <onboarding@resend.dev>';
const DEFAULT_OWNER_EMAIL = 'aroobaasghar37@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json().catch(() => ({}));
  const ownerEmail = body.ownerEmail || DEFAULT_OWNER_EMAIL;
  const userEmail = body.userEmail || 'unknown';
  const fullName = body.fullName || 'New CineVerse user';

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: 'New CineVerse signup',
      html: `
        <h2>New CineVerse signup</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
      `
    })
  });

  const result = await resendResponse.json().catch(() => ({}));
  return new Response(JSON.stringify(result), {
    status: resendResponse.ok ? 200 : 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
