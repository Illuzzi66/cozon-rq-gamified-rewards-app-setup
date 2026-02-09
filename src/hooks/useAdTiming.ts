import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdTimingState {
  shouldShowCommentAd: boolean;
  shouldShowTimeAd: boolean;
  shouldShowPostAd: boolean;
  resetCommentCount: () => Promise<void>;
  resetSessionTime: () => Promise<void>;
  incrementCommentCount: () => Promise<void>;
}

const COMMENTS_BEFORE_AD = 5;
const MINUTES_BEFORE_AD = 5;

export const useAdTiming = (): AdTimingState => {
  const { profile, refreshProfile } = useAuth();
  const [shouldShowCommentAd, setShouldShowCommentAd] = useState(false);
  const [shouldShowTimeAd, setShouldShowTimeAd] = useState(false);
  const [shouldShowPostAd, setShouldShowPostAd] = useState(false);

  // Check comment count
  useEffect(() => {
    if (profile && profile.comment_count >= COMMENTS_BEFORE_AD) {
      setShouldShowCommentAd(true);
    } else {
      setShouldShowCommentAd(false);
    }
  }, [profile?.comment_count]);

  // Check session time
  useEffect(() => {
    if (!profile?.session_start_time) return;

    const checkSessionTime = () => {
      const sessionStart = new Date(profile.session_start_time!).getTime();
      const now = Date.now();
      const minutesElapsed = (now - sessionStart) / (1000 * 60);

      if (minutesElapsed >= MINUTES_BEFORE_AD) {
        setShouldShowTimeAd(true);
      }
    };

    // Check immediately
    checkSessionTime();

    // Check every minute
    const interval = setInterval(checkSessionTime, 60000);

    return () => clearInterval(interval);
  }, [profile?.session_start_time]);

  // Premium users should see ad before posting
  useEffect(() => {
    if (profile?.is_premium) {
      setShouldShowPostAd(true);
    }
  }, [profile?.is_premium]);

  const resetCommentCount = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ comment_count: 0 })
      .eq('user_id', profile.user_id);

    if (!error) {
      await refreshProfile();
      setShouldShowCommentAd(false);
    }
  };

  const resetSessionTime = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ session_start_time: new Date().toISOString() })
      .eq('user_id', profile.user_id);

    if (!error) {
      await refreshProfile();
      setShouldShowTimeAd(false);
    }
  };

  const incrementCommentCount = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ comment_count: profile.comment_count + 1 })
      .eq('user_id', profile.user_id);

    if (!error) {
      await refreshProfile();
    }
  };

  return {
    shouldShowCommentAd,
    shouldShowTimeAd,
    shouldShowPostAd,
    resetCommentCount,
    resetSessionTime,
    incrementCommentCount,
  };
};
