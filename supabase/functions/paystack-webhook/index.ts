
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

async function sendEmailNotification(
  supabase: any,
  userEmail: string,
  subject: string,
  html: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email-notification', {
      body: {
        to: userEmail,
        subject,
        html,
      },
    });

    if (error) {
      console.error('Failed to send email:', error);
    } else {
      console.log('Email sent successfully:', data);
    }
  } catch (error) {
    console.error('Error invoking email function:', error);
  }
}

function getEmailTemplate(type: 'success' | 'failed' | 'reversed', amount: string, reference: string, reason?: string): string {
  const baseStyle = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Cozon RQ</h1>
      </div>
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
  `;

  const footer = `
      </div>
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>© 2026 Cozon RQ. All rights reserved.</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  if (type === 'success') {
    return `${baseStyle}
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background-color: #10b981; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 30px;">✓</span>
          </div>
        </div>
        <h2 style="color: #1f2937; text-align: center; margin-bottom: 20px;">Payment Successful!</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Great news! Your withdrawal of <strong style="color: #10b981;">${amount}</strong> has been successfully processed and sent to your account.
        </p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Reference:</strong> ${reference}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          The funds should appear in your account within a few minutes to 24 hours depending on your bank.
        </p>
      ${footer}`;
  } else if (type === 'failed') {
    return `${baseStyle}
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background-color: #ef4444; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 30px;">✕</span>
          </div>
        </div>
        <h2 style="color: #1f2937; text-align: center; margin-bottom: 20px;">Payment Failed</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Your withdrawal of <strong>${amount}</strong> has been reversed and returned to your wallet.
        </p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Reference:</strong> ${reference}</p>
          ${reason ? `<p style="margin: 5px 0; color: #991b1b; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Don't worry! We're automatically retrying the payment. Your coins have been returned to your wallet. If the issue persists, please contact support.
        </p>
      ${footer}`;
  } else {
    return `${baseStyle}
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background-color: #f59e0b; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 30px;">↻</span>
          </div>
        </div>
        <h2 style="color: #1f2937; text-align: center; margin-bottom: 20px;">Payment Reversed</h2>
        <p style="color: #4b5563; font-