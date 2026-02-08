
import { useState, useCallback } from 'react';

export interface AdReward {
  type: string;
  amount: number;
}

export function useAdManager() {
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewarded, setShowRewarded] = useState(false);
  const [rewardCallback, setRewardCallback] = useState<((reward: AdReward) => void) | null>(null);

  const showInterstitialAd = useCallback((onComplete?: () => void) => {
    setShowInterstitial(true);
    if (onComplete) {
      // Store callback to execute after ad closes
      const originalClose = () => {
        setShowInterstitial(false);
        onComplete();
      };
      return originalClose;
    }
    return () => setShowInterstitial(false);
  }, []);

  const showRewardedAd = useCallback((onReward: (reward: AdReward) => void) => {
    setRewardCallback(() => onReward);
    setShowRewarded(true);
  }, []);

  const closeInterstitial = useCallback(() => {
    setShowInterstitial(false);
  }, []);

  const closeRewarded = useCallback(() => {
    setShowRewarded(false);
    setRewardCallback(null);
  }, []);

  const handleRewardEarned = useCallback((reward: AdReward) => {
    if (rewardCallback) {
      rewardCallback(reward);
    }
    closeRewarded();
  }, [rewardCallback, closeRewarded]);

  return {
    showInterstitial,
    showRewarded,
    showInterstitialAd,
    showRewardedAd,
    closeInterstitial,
    closeRewarded,
    handleRewardEarned,
  };
}