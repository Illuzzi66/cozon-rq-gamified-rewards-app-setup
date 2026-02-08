
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ADMOB_CONFIG, BannerSize, trackAdImpression, simulateAdLoad } from '@/lib/admob';

interface BannerAdProps {
  size?: BannerSize;
  className?: string;
}

export function BannerAd({ size = BannerSize.STANDARD, className = '' }: BannerAdProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadAd();
  }, []);

  const loadAd = async () => {
    try {
      // Simulate ad loading
      await simulateAdLoad(800);
      setIsLoaded(true);
      trackAdImpression('banner', ADMOB_CONFIG.BANNER_AD_UNIT);
    } catch (err) {
      console.error('Failed to load banner ad:', err);
      setError(true);
    }
  };

  if (error) {
    return null; // Don't show anything if ad fails to load
  }

  if (!isLoaded) {
    return (
      <div className={`w-full bg-muted/30 animate-pulse rounded-lg ${className}`}>
        <div className="h-[50px] flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading ad...</span>
        </div>
      </div>
    );
  }

  // Simulated banner ad display
  return (
    <Card className={`w-full overflow-hidden border-border/50 ${className}`}>
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
            <div>
              <p className="text-xs font-semibold">Sponsored Content</p>
              <p className="text-[10px] text-muted-foreground">Advertisement</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Ad</div>
        </div>
      </div>
    </Card>
  );
}