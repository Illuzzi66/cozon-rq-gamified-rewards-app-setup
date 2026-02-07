
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string;
    customer: {
      email: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { reference, userId } = await req.json();

    if (!reference || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing reference or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.ok) {
      throw new Error('Failed to verify payment with Paystack');
    }

    const paystackData: PaystackVerifyResponse = await paystackResponse.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not successful' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update purchase record
    const { error: updateError } = await supabase
      .from('premium_purchases')
      .update({
        status: 'success',
        paystack_transaction_id: paystackData.data.id.toString(),
        verified_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating purchase:', updateError);
      throw updateError;
    }

    // Activate premium
    const { data: activateData, error: activateError } = await supabase.rpc(
      'activate_premium',
      {
        p_user_id: userId,
        p_paystack_reference: reference,
      }
    );

    if (activateError) {
      console.error('Error activating premium:', activateError);
      throw activateError;
    }

    if (!activateData.success) {
      return new Response(
        JSON.stringify({ success: false, error: activateData.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Premium activated successfully',
        amount: paystackData.data.amount / 100, // Convert from kobo to naira
        paidAt: paystackData.data.paid_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});