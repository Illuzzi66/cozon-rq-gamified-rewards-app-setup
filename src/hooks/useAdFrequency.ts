
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdFrequencySettings {
  max_ads_per_hour: number;
  max_ads_per_day: number;
  min_seconds_between_ads: number;
}

export function useAdFrequency() {
  const { profile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<AdFrequencySettings>({
    max_ads_per_hour: 6,
    max_ads_per_day: 50,
    min_seconds_between_ads: 0,
  });
  const [canShowAd, setCanShowAd] = useState(true);
  const [timeUntilNextAd, setTimeUntilNextAd] = useState(0);

  // Fetch ad frequency settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'ad_frequency')
        .single();

      if (data?.setting_value) {
        setSettings(data.setting_value as AdFrequencySettings);
      }
    };

    fetchSettings();
  }, []);

  // Check if user can see an ad
  useEffect(() => {
    if (!profile) {
      setCanShowAd(false);
      return;
    }

    // Premium users don't have frequency caps
    if (profile.is_premium) {
      setCanShowAd(true);
      setTimeUntilNextAd(0);
      return;
    }

    const now = new Date();
    const lastAdShown = profile.last_ad_shown_at ? new Date(profile.last_ad_shown_at) : null;
    const adHourReset = profile.ad_hour_reset_at ? new Date(profile.ad_hour_reset_at) : null;

    // Check minimum time between ads
    if (lastAdShown) {
      const secondsSinceLastAd = (now.getTime() - lastAdShown.getTime()) / 1000;
      if (secondsSinceLastAd < settings.min_seconds_between_ads) {
        setCanShowAd(false);
        setTimeUntilNextAd(Math.ceil(settings.min_seconds_between_ads - secondsSinceLastAd));
        return;
      }
    }

    // Reset hourly counter if needed
    if (!adHourReset || now.getTime() - adHourReset.getTime() > 3600000) {
      // Hour has passed, counter will be reset on next ad
      setCanShowAd(true);
      setTimeUntilNextAd(0);
      return;
    }

    // Check hourly limit
    if (profile.ads_shown_this_hour >= settings.max_ads_per_hour) {
      const timeUntilHourReset = Math.ceil((adHourReset.getTime() + 3600000 - now.getTime()) / 1000);
      setCanShowAd(false);
      setTimeUntilNextAd(timeUntilHourReset);
      return;
    }

    // Check daily limit
    if (profile.ads_shown_today >= settings.max_ads_per_day) {
      setCanShowAd(false);
      setTimeUntilNextAd(0); // Will reset at midnight
      return;
    }

    setCanShowAd(true);
    setTimeUntilNextAd(0);
  }, [profile, settings]);

  // Record that an ad was shown
  const recordAdShown = async () => {
    if (!profile) return;

    const now = new Date();
    const adHourReset = profile.ad_hour_reset_at ? new Date(profile.ad_hour_reset_at) : null;
    const shouldResetHour = !adHourReset || now.getTime() - adHourReset.getTime() > 3600000;

    const { error } = await supabase
      .from('profiles')
      .update({
        last_ad_shown_at: now.toISOString(),
        ads_shown_this_hour: shouldResetHour ? 1 : profile.ads_shown_this_hour + 1,
        ads_shown_today: profile.ads_shown_today + 1,
        ad_hour_reset_at: shouldResetHour ? now.toISOString() : profile.ad_hour_reset_at,
      })
      .eq('user_id', profile.user_id);

    if (!error) {
      await refreshProfile();
    }
  };

  return {
    canShowAd,
    timeUntilNextAd,
    recordAdShown,
    settings,
  };
}