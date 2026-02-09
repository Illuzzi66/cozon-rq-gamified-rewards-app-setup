
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dhzgnxfhcgjzlzmfdfid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoemdueGZoY2dqemx6bWZkZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODAzMDksImV4cCI6MjA4NjA1NjMwOX0.3J-w-sbb0MX03QUMh1H6woc_HHTP17rjoBjnSFpfcK8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          username: string;
          email: string;
          device_id: string;
          referral_code: string | null;
          referred_by: string | null;
          is_premium: boolean;
          coin_balance: number;
          locked_coins: number;
          spins_available: number;
          last_daily_login: string | null;
          last_ad_shown_at: string | null;
          ads_shown_today: number;
          ads_shown_this_hour: number;
          ad_hour_reset_at: string | null;
          session_start_time: string | null;
          comment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      spin_history: {
        Row: {
          id: string;
          user_id: string;
          reward_type: 'coins' | 'money' | 'spins' | 'loss';
          reward_amount: number;
          reward_subtype: string | null;
          money_amount: number;
          created_at: string;
        };
      };
      task_completions: {
        Row: {
          id: string;
          user_id: string;
          task_type: string;
          coins_earned: number;
          completed_at: string;
        };
      };
      meme_interactions: {
        Row: {
          id: string;
          user_id: string;
          meme_id: string;
          interaction_type: 'like' | 'comment';
          comment_text: string | null;
          coins_earned: number;
          created_at: string;
        };
      };
      withdrawals: {
        Row: {
          id: string;
          user_id: string;
          amount_coins: number;
          amount_usd: number;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
          processed_at: string | null;
        };
      };
    };
  };
};