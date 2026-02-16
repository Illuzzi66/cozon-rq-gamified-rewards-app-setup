
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  user_id: string;
  username: string;
  email: string;
  coins: number;
  spins_available: number;
  is_premium: boolean;
  premium_expires_at: string | null;
  last_spin: string | null;
  last_ad_watch: string | null;
  last_ad_watch_spins: string | null;
  daily_ad_count: number;
  hourly_ad_count: number;
  last_ad_hour_reset: string | null;
  last_ad_day_reset: string | null;
  created_at: string;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  last_daily_bonus: string | null;
  comment_count: number;
  last_comment_ad: string | null;
  session_start: string | null;
  last_time_ad: string | null;
  deviceId: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  deviceId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('Fetching fresh profile data for user:', user.id);
      const profileData = await fetchProfile(user.id);
      if (profileData) {
        console.log('Setting new profile data:', profileData);
        // Force new object reference to trigger re-renders
        setProfile({ ...profileData });
        return profileData;
      }
    }
    return null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
        // Log user login (non-blocking) - add .then() before .catch()
        supabase.rpc('log_user_login', { p_user_id: session.user.id }).then(() => {}).catch(() => {});
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
        // Log user login (non-blocking) - add .then() before .catch()
        supabase.rpc('log_user_login', { p_user_id: session.user.id }).then(() => {}).catch(() => {});
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        persistSession: rememberMe,
      },
    });

    if (error) throw error;

    if (data.user) {
      // Check if user is banned
      const profileData = await fetchProfile(data.user.id);
      if (profileData?.is_banned) {
        await supabase.auth.signOut();
        throw new Error('Your account has been suspended. Please contact support.');
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Get or create device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const deviceId = getDeviceId();

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile, deviceId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};