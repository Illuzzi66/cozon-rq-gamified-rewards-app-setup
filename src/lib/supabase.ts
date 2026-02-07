
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
          last_daily_login: string | null;
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
          reward_type: string;
          reward_amount: number;
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