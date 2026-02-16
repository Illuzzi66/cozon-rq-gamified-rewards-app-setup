
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

interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    transfer_code: string;
    id: number;
    status: string;
    amount: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Paystack API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { withdrawalId, adminId } = await req.json();

    if (!withdrawalId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing withdrawalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Fetch withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*, user:profiles(username, email)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify withdrawal can be retried
    if (!['failed', 'retry_pending'].includes(withdrawal.status)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal cannot be retried' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const retryCount = (withdrawal.payment_details?.retry_count || 0) + 1;
    const maxRetries = 3;

    if (retryCount > maxRetries) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum retry attempts exceeded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract payment details
    const paymentDetails = withdrawal.payment_details;
    const recipientCode = paymentDetails?.recipient_code;

    if (!recipientCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recipient code not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retry transfer with new reference
    const amountInKobo = Math.round(withdrawal.amount * 100);
    const transferReference = `WD-${withdrawalId}-RETRY${retryCount}-${Date.now()}`;

    const transferPayload = {
      source: 'balance',
      amount: amountInKobo,
      recipient: recipientCode,
      reason: `Withdrawal retry ${retryCount} for ${withdrawal.user.username}`,
      reference: transferReference,
    };

    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferPayload),
    });

    if (!transferResponse.ok) {
      const errorData = await transferResponse.json();
      
      // Update withdrawal with retry failure
      await supabase
        .from('withdrawals')
        .update({
          status: retryCount >= maxRetries ? 'failed' : 'retry_pending',
          payment_details: {
            ...paymentDetails,
            retry_count: retryCount,
            last_retry_at: new Date().toISOString(),
            last_error: errorData.message || 'Unknown error',
          },
          admin_note: retryCount >= maxRetries
            ? `Payment failed after ${maxRetries} retry attempts: ${errorData.message || 'Unknown error'}`
            : `Retry ${retryCount} failed: ${errorData.message || 'Unknown error'}`,
        })
        .eq('id', withdrawalId);

      throw new Error(`Transfer retry failed: ${errorData.message || 'Unknown error'}`);
    }

    const transferData: PaystackTransferResponse = await transferResponse.json();

    if (!transferData.status) {
      // Update withdrawal with retry failure
      await supabase
        .from('withdrawals')
        .update({
          status: retryCount >= maxRetries ? 'failed' : 'retry_pending',
          payment_details: {
            ...paymentDetails,
            retry_count: retryCount,
            last_retry_at: new Date().toISOString(),
            last_error: transferData.message,
          },
          admin_note: retryCount >= maxRetries
            ? `Payment failed after ${maxRetries} retry attempts: ${transferData.message}`
            : `Retry ${retryCount} failed: ${transferData.message}`,
        })
        .eq('id', withdrawalId);

      throw new Error(`Transfer retry failed: ${transferData.message}`);
    }

    // Update withdrawal with retry success
    await supabase
      .from('withdrawals')
      .update({
        status: 'processing',
        payment_details: {
          ...paymentDetails,
          paystack_reference: transferReference,
          paystack_transfer_code: transferData.data.transfer_code,
          paystack_transfer_id: transferData.data.id,
          retry_count: retryCount,
          last_retry_at: new Date().toISOString(),
          paystack_status: transferData.data.status,
        },
        admin_note: `Payment retry ${retryCount} initiated successfully`,
        reviewed_at: new Date().toISOString(),
        admin_id: adminId || withdrawal.admin_id,
      })
      .eq('id', withdrawalId);

    // Send notification
    await supabase.from('notifications').insert({
      user_id: withdrawal.user_id,
      type: 'withdrawal_retry',
      title: '🔄 Payment Retry Initiated',
      message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} is being retried (attempt ${retryCount}).`,
      data: {
        withdrawal_id: withdrawalId,
        amount: withdrawal.amount,
        reference: transferReference,
        retry_count: retryCount,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment retry initiated successfully',
        data: {
          transfer_code: transferData.data.transfer_code,
          reference: transferReference,
          retry_count: retryCount,
          status: transferData.data.status,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error retrying withdrawal:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to retry withdrawal'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});