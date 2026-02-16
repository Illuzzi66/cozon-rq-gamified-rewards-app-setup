
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
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    status: string;
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface PaystackRecipientResponse {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string;
      bank_code: string;
      bank_name: string;
    };
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

    if (!withdrawalId || !adminId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing withdrawalId or adminId' }),
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
      .select(`
        *,
        user:profiles(username, email)
      `)
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify withdrawal is pending
    if (withdrawal.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal is not pending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract payment details
    const paymentDetails = withdrawal.payment_details;
    if (!paymentDetails?.account_number || !paymentDetails?.bank_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payment details' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create transfer recipient
    const recipientPayload = {
      type: 'nuban',
      name: paymentDetails.account_name || withdrawal.user.username,
      account_number: paymentDetails.account_number,
      bank_code: paymentDetails.bank_code,
      currency: 'NGN',
    };

    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipientPayload),
    });

    if (!recipientResponse.ok) {
      const errorData = await recipientResponse.json();
      throw new Error(`Failed to create recipient: ${errorData.message || 'Unknown error'}`);
    }

    const recipientData: PaystackRecipientResponse = await recipientResponse.json();

    if (!recipientData.status) {
      throw new Error(`Recipient creation failed: ${recipientData.message}`);
    }

    // Step 2: Initiate transfer
    const amountInKobo = Math.round(withdrawal.amount * 100); // Convert dollars to kobo (assuming 1 USD = 100 kobo for simplicity)
    const transferReference = `WD-${withdrawalId}-${Date.now()}`;

    const transferPayload = {
      source: 'balance',
      amount: amountInKobo,
      recipient: recipientData.data.recipient_code,
      reason: `Withdrawal for ${withdrawal.user.username}`,
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
      
      // Update withdrawal status to failed
      await supabase
        .from('withdrawals')
        .update({
          status: 'failed',
          admin_note: `Payment failed: ${errorData.message || 'Unknown error'}`,
          reviewed_at: new Date().toISOString(),
          admin_id: adminId,
        })
        .eq('id', withdrawalId);

      throw new Error(`Transfer failed: ${errorData.message || 'Unknown error'}`);
    }

    const transferData: PaystackTransferResponse = await transferResponse.json();

    if (!transferData.status) {
      // Update withdrawal status to failed
      await supabase
        .from('withdrawals')
        .update({
          status: 'failed',
          admin_note: `Payment failed: ${transferData.message}`,
          reviewed_at: new Date().toISOString(),
          admin_id: adminId,
        })
        .eq('id', withdrawalId);

      throw new Error(`Transfer failed: ${transferData.message}`);
    }

    // Step 3: Update withdrawal record with success
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        admin_id: adminId,
        reviewed_at: new Date().toISOString(),
        admin_note: 'Payment processed successfully via Paystack',
        payment_details: {
          ...paymentDetails,
          paystack_reference: transferReference,
          paystack_transfer_code: transferData.data.transfer_code,
          paystack_transfer_id: transferData.data.id,
          recipient_code: recipientData.data.recipient_code,
        },
      })
      .eq('id', withdrawalId);

    if (updateError) {
      console.error('Error updating withdrawal:', updateError);
      throw updateError;
    }

    // Step 4: Create notification for user
    await supabase.from('notifications').insert({
      user_id: withdrawal.user_id,
      type: 'withdrawal_approved',
      title: '🎉 Withdrawal Approved!',
      message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been approved and payment is being processed.`,
      data: {
        withdrawal_id: withdrawalId,
        amount: withdrawal.amount,
        reference: transferReference,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        data: {
          transfer_code: transferData.data.transfer_code,
          reference: transferReference,
          amount: withdrawal.amount,
          status: transferData.data.status,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process withdrawal'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});