// Supabase Edge Function: create-transaction
// Fungsi ini bikin order_id unik, simpan status "pending" di tabel payments,
// lalu minta Snap Token ke Midtrans. Server key Midtrans HANYA hidup di sini,
// bukan di kode frontend, supaya aman.
//
// Deploy: lihat README.md bagian "Deploy Edge Functions"
// Environment variable yang perlu diset di Supabase Dashboard > Edge Functions > Secrets:
//   MIDTRANS_SERVER_KEY   -> dari akun Midtrans kamu (Sandbox atau Production)
//   SUPABASE_URL          -> otomatis tersedia
//   SUPABASE_SERVICE_ROLE_KEY -> dari Project Settings > API

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!;
const MIDTRANS_BASE_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions'; // ganti ke app.midtrans.com kalau sudah production

// CORS: wajib ada supaya function ini bisa dipanggil dari browser (website kita)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Browser selalu kirim request "OPTIONS" duluan buat cek izin CORS -- wajib dijawab dulu
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, amount } = await req.json();
    if (!user_id || !amount) {
      return new Response(JSON.stringify({ error: 'user_id dan amount wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const order_id = `ARGO-${user_id.slice(0, 8)}-${Date.now()}`;

    // Simpan record pembayaran pending
    await supabaseAdmin.from('payments').insert({ user_id, order_id, amount, status: 'pending' });

    // Minta Snap Token ke Midtrans
    const midtransRes = await fetch(MIDTRANS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(MIDTRANS_SERVER_KEY + ':'),
      },
      body: JSON.stringify({
        transaction_details: { order_id, gross_amount: amount },
        credit_card: { secure: true },
      }),
    });

    const midtransData = await midtransRes.json();
    if (!midtransRes.ok) {
      return new Response(JSON.stringify({ error: midtransData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ token: midtransData.token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
