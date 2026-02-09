import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface PushNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, title, message, type, metadata } = await req.json() as PushNotificationPayload;

    // Get user's push subscription from database
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.push_subscription) {
      console.log('No push subscription found for user:', userId);
      return new Response(
        JSON.stringify({ success: false, message: 'No push subscription found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@cozonrq.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    // Prepare notification payload
    const notificationPayload = {
      title,
      body: message,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        type,
        metadata,
        url: getNotificationUrl(type, metadata),
      },
    };

    // Send push notification using Web Push protocol
    const subscription = profile.push_subscription;
    
    // Use web-push library (would need to be imported)
    // For now, we'll create the notification in the database
    // and rely on client-side polling or WebSocket for delivery
    
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: metadata || {},
        is_read: false,
      });

    if (notificationError) {
      throw notificationError;
    }

    // Log push attempt
    console.log('Push notification created for user:', userId, 'Type:', type);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function getNotificationUrl(type: string, metadata?: Record<string, any>): string {
  switch (type) {
    case 'withdrawal_approved':
    case 'withdrawal_rejected':
    case 'withdrawal_completed':
      return '/wallet';
    case 'task_completed':
      return '/tasks';
    case 'leaderboard_reward':
      return '/leaderboard';
    case 'referral_reward':
      return '/profile';
    case 'achievement':
      return '/dashboard';
    default:
      return '/notifications';
  }
}
