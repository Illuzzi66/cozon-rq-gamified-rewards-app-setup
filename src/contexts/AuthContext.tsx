
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  is_premium: boolean;
  coin_balance: number;
  locked_coins: number;
  referral_code: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface SignUpData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  referralCode?: string;
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
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: SignUpData) => {
    // Check device ID
    const { data: existingDevice } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', data.deviceId)
      .single();

    if (existingDevice) {
      throw new Error('Only one account allowed per device');
    }

    // Check username uniqueness
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', data.username)
      .single();

    if (existingUsername) {
      throw new Error('Username already taken');
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed');

    // Generate unique referral code
    const referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      full_name: data.fullName,
      username: data.username,
      email: data.email,
      device_id: data.deviceId,
      referral_code: referralCode,
      referred_by: data.referralCode || null,
      is_premium: false,
      coin_balance: 0,
      locked_coins: 0,
      last_daily_login: null,
    });

    if (profileError) throw profileError;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
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