
// AdMob configuration and utilities
export const ADMOB_CONFIG = {
  // Replace these with your actual AdMob IDs
  APP_ID: import.meta.env.VITE_ADMOB_APP_ID || 'ca-app-pub-3940256099942544~3347511713', // Test App ID
  BANNER_AD_UNIT: import.meta.env.VITE_ADMOB_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111', // Test Banner
  INTERSTITIAL_AD_UNIT: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/1033173712', // Test Interstitial
  REWARDED_AD_UNIT: import.meta.env.VITE_ADMOB_REWARDED_ID || 'ca-app-pub-3940256099942544/5224354917', // Test Rewarded
};

// Ad types
export enum AdType {
  BANNER = 'banner',
  INTERSTITIAL = 'interstitial',
  REWARDED = 'rewarded',
}

// Ad sizes for banners
export enum BannerSize {
  STANDARD = 'BANNER', // 320x50
  LARGE = 'LARGE_BANNER', // 320x100
  MEDIUM_RECTANGLE = 'MEDIUM_RECTANGLE', // 300x250
  FULL_BANNER = 'FULL_BANNER', // 468x60
  LEADERBOARD = 'LEADERBOARD', // 728x90
  SMART = 'SMART_BANNER', // Screen width x 32|50|90
}

// Check if AdMob is available (for web, we'll simulate)
export const isAdMobAvailable = (): boolean => {
  // In a real mobile app, check for AdMob plugin
  // For web, we'll use a simulation mode
  return true;
};

// Simulate ad loading for web environment
export const simulateAdLoad = (duration: number = 1000): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
};

// Track ad impressions
export const trackAdImpression = (adType: AdType, adUnit: string) => {
  console.log(`[AdMob] Ad impression tracked: ${adType} - ${adUnit}`);
  // In production, send to analytics
};

// Track ad clicks
export const trackAdClick = (adType: AdType, adUnit: string) => {
  console.log(`[AdMob] Ad click tracked: ${adType} - ${adUnit}`);
  // In production, send to analytics
};

// Track ad rewards
export const trackAdReward = (adType: AdType, rewardAmount: number) => {
  console.log(`[AdMob] Ad reward tracked: ${adType} - ${rewardAmount}`);
  // In production, send to analytics
};