
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    transfer_code: string;
    transferred_at: string | null;
    recipient: {
      recipient_code: string;
      name: string;
      type: string;
      details: {
        account_number: string;
        account_name: string;
        bank_code: string;
        bank_name: string;
      };
    };
    reason: string;
    currency: string;
    source: string;
    failures: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

function verifyPaystackSignature(payload: string, signature: string): boolean {
  if (!PAYSTACK_SECRET_KEY) return false;
  
  const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const payload = await req.text();
    
    if (!signature || !verifyPaystackSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event: PaystackWebhookEvent = JSON.parse(payload);
    console.log('Received webhook event:', event.event);

    // Only process transfer events
    if (!event.event.startsWith('transfer.')) {
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Extract withdrawal ID from reference (format: WD-{withdrawalId}-{timestamp})
    const reference = event.data.reference;
    const withdrawalId = reference.split('-')[1];

    if (!withdrawalId) {
      console.error('Invalid reference format:', reference);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid reference format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch withdrawal record
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*, user:profiles(username, email)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      console.error('Withdrawal not found:', withdrawalId);
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different transfer events
    switch (event.event) {
      case 'transfer.success':
        // Update withdrawal to completed
        await supabase
          .from('withdrawals')
          .update({
            status: 'completed',
            processed_at: event.data.transferred_at || new Date().toISOString(),
            payment_details: {
              ...withdrawal.payment_details,
              paystack_status: 'success',
              paystack_message: event.data.message,
              gateway_response: event.data.gateway_response,
              transferred_at: event.data.transferred_at,
            },
          })
          .eq('id', withdrawalId);

        // Send success notification
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal_completed',
          title: '✅ Payment Sent!',
          message: `Your withdrawal of $${(event.data.amount / 100).toFixed(2)} has been successfully transferred to your account.`,
          data: {
            withdrawal_id: withdrawalId,
            amount: event.data.amount / 100,
            reference: reference,
            transfer_code: event.data.transfer_code,
          },
        });
        break;

      case 'transfer.failed':
        // Update withdrawal to failed and prepare for retry
        const retryCount = (withdrawal.payment_details?.retry_count || 0) + 1;
        const maxRetries = 3;

        await supabase
          .from('withdrawals')
          .update({
            status: retryCount >= maxRetries ? 'failed' : 'retry_pending',
            payment_details: {
              ...withdrawal.payment_details,
              paystack_status: 'failed',
              paystack_message: event.data.message,
              gateway_response: event.data.gateway_response,
              failures: event.data.failures,
              retry_count: retryCount,
              last_retry_at: new Date().toISOString(),
            },
            admin_note: retryCount >= maxRetries 
              ? `Payment failed after ${maxRetries} attempts: ${event.data.message || 'Unknown error'}`
              : `Payment failed (attempt ${retryCount}/${maxRetries}): ${event.data.message || 'Unknown error'}. Retry pending.`,
          })
          .eq('id', withdrawalId);

        // Send notification
        if (retryCount >= maxRetries) {
          await supabase.from('notifications').insert({
            user_id: withdrawal.user_id,
            type: 'withdrawal_failed',
            title: '❌ Payment Failed',
            message: `Your withdrawal of $${(event.data.amount / 100).toFixed(2)} could not be processed. Please contact support.`,
            data: {
              withdrawal_id: withdrawalId,
              amount: event.data.amount / 100,
              reason: event.data.message || 'Unknown error',
            },
          });
        } else {
          await supabase.from('notifications').insert({
            user_id: withdrawal.user_id,
            type: 'withdrawal_retry',
            title: '⏳ Payment Retry',
            message: `Your withdrawal is being retried. Attempt ${retryCount} of ${maxRetries}.`,
            data: {
              withdrawal_id: withdrawalId,
              amount: event.data.amount / 100,
              retry_count: retryCount,
            },
          });
        }
        break;

      case 'transfer.reversed':
        // Handle reversal - return coins to user
        await supabase
          .from('withdrawals')
          .update({
            status: 'reversed',
            payment_details: {
              ...withdrawal.payment_details,
              paystack_status: 'reversed',
              paystack_message: event.data.message,
              gateway_response: event.data.gateway_response,
            },
            admin_note: `Payment reversed: ${event.data.message || 'Unknown reason'}`,
          })
          .eq('id', withdrawalId);

        // Return coins to user
        await supabase.rpc('unlock_coins', {
          p_user_id: withdrawal.user_id,
          p_amount: withdrawal.amount_coins,
        });

        // Send notification
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal_reversed',
          title: '🔄 Payment Reversed',
          message: `Your withdrawal of $${(event.data.amount / 100).toFixed(2)} was reversed. Coins have been returned to your account.`,
          data: {
            withdrawal_id: withdrawalId,
            amount: event.data.amount / 100,
            coins_returned: withdrawal.amount_coins,
          },
        });
        break;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process webhook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});