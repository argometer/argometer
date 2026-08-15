// Supabase Edge Function: midtrans-webhook
// Midtrans akan memanggil URL ini otomatis setiap ada perubahan status pembayaran.
// Setelah deploy, daftarkan URL function ini di:
//   Midtrans Dashboard > Settings > Configuration > Payment Notification URL
//
// Environment variable yang perlu diset (sama seperti create-transaction):
//   MIDTRANS_SERVER_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!;

// CORS: Midtrans sendiri jarang butuh ini (server-to-server), tapi aman ditambahkan
// jaga-jaga kalau kamu mau test manual dari browser.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;

    // Verifikasi signature supaya request beneran dari Midtrans, bukan orang iseng
    const encoder = new TextEncoder();
    const data = encoder.encode(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const expectedSignature = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== signature_key) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update status pembayaran
    await supabaseAdmin.from('payments').update({ status: transaction_status }).eq('order_id', order_id);

    // Kalau pembayaran sukses ('settlement' atau 'capture'), aktifkan premium 30 hari
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      const { data: payment } = await supabaseAdmin
        .from('payments').select('user_id').eq('order_id', order_id).single();

      if (payment) {
        const premiumUntil = new Date();
        premiumUntil.setDate(premiumUntil.getDate() + 31); // langganan 31 hari

        await supabaseAdmin.from('profiles')
          .update({ is_premium: true, premium_until: premiumUntil.toISOString() })
          .eq('id', payment.user_id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
