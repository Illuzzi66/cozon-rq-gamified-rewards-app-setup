
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AdFrequencySettings {
  max_ads_per_hour: number;
  max_ads_per_day: number;
  min_seconds_between_ads: number;
}

export const useAdFrequency = () => {
  const { profile, refreshProfile } = useAuth();
  const [canShowAd, setCanShowAd] = useState(true);
  const [settings, setSettings] = useState<AdFrequencySettings>({
    max_ads_per_hour: 6,
    max_ads_per_day: 50,
    min_seconds_between_ads: 300,
  });
  const [timeUntilNextAd, setTimeUntilNextAd] = useState(0);

  // Load ad frequency settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'ad_frequency')
          .single();

        if (error) throw error;
        if (data) {
          setSettings(data.setting_value as AdFrequencySettings);
        }
      } catch (error) {
        console.error('Error loading ad frequency settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Check if user can see an ad
  useEffect(() => {
    if (!profile) return;

    const checkAdEligibility = () => {
      const now = new Date();
      
      // Check last ad shown time
      if (profile.last_ad_shown_at) {
        const lastAdTime = new Date(profile.last_ad_shown_at);
        const secondsSinceLastAd = (now.getTime() - lastAdTime.getTime()) / 1000;
        
        if (secondsSinceLastAd < settings.min_seconds_between_ads) {
          setCanShowAd(false);
          setTimeUntilNextAd(Math.ceil(settings.min_seconds_between_ads - secondsSinceLastAd));
          return;
        }
      }

      // Check hourly limit
      if (profile.ads_shown_this_hour >= settings.max_ads_per_hour) {
        const hourResetTime = new Date(profile.ad_hour_reset_at || now);
        const minutesUntilReset = Math.ceil((hourResetTime.getTime() + 3600000 - now.getTime()) / 60000);
        
        if (minutesUntilReset > 0) {
          setCanShowAd(false);
          setTimeUntilNextAd(minutesUntilReset * 60);
          return;
        }
      }

      // Check daily limit
      if (profile.ads_shown_today >= settings.max_ads_per_day) {
        setCanShowAd(false);
        setTimeUntilNextAd(0); // Will reset at midnight
        return;
      }

      setCanShowAd(true);
      setTimeUntilNextAd(0);
    };

    checkAdEligibility();

    // Update every second for countdown
    const interval = setInterval(checkAdEligibility, 1000);
    return () => clearInterval(interval);
  }, [profile, settings]);

  // Record that an ad was shown
  const recordAdShown = async () => {
    if (!profile) return;

    try {
      const now = new Date();
      const hourResetTime = new Date(profile.ad_hour_reset_at || now);
      
      // Check if we need to reset hourly counter
      const shouldResetHour = now.getTime() - hourResetTime.getTime() >= 3600000;

      const { error } = await supabase
        .from('profiles')
        .update({
          last_ad_shown_at: now.toISOString(),
          ads_shown_today: profile.ads_shown_today + 1,
          ads_shown_this_hour: shouldResetHour ? 1 : profile.ads_shown_this_hour + 1,
          ad_hour_reset_at: shouldResetHour ? now.toISOString() : profile.ad_hour_reset_at,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      await refreshProfile();
    } catch (error) {
      console.error('Error recording ad shown:', error);
    }
  };

  // Reset daily counter (called at midnight)
  const resetDailyCounter = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ads_shown_today: 0,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;
      await refreshProfile();
    } catch (error) {
      console.error('Error resetting daily counter:', error);
    }
  };

  return {
    canShowAd,
    timeUntilNextAd,
    settings,
    recordAdShown,
    resetDailyCounter,
  };
};