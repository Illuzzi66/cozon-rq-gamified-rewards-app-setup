
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Clock } from 'lucide-react';
import { ADMOB_CONFIG, trackAdImpression, trackAdClick, simulateAdLoad } from '@/lib/admob';
import { useAdFrequency } from '@/hooks/useAdFrequency';

interface InterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted?: () => void;
  onAdWatched?: () => void;
}

export function InterstitialAd({ isOpen, onClose, onAdCompleted, onAdWatched }: InterstitialAdProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(300);
  const [canClose, setCanClose] = useState(false);
  const { canShowAd, timeUntilNextAd, recordAdShown } = useAdFrequency();

  useEffect(() => {
    if (isOpen) {
      if (canShowAd) {
        loadAd();
      }
    }
  }, [isOpen, canShowAd]);

  useEffect(() => {
    if (isOpen && !isLoading && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanClose(true);
    }
  }, [isOpen, isLoading, countdown]);

  const loadAd = async () => {
    setIsLoading(true);
    setCountdown(300);
    setCanClose(false);
    
    try {
      await simulateAdLoad(1500);
      setIsLoading(false);
      trackAdImpression('interstitial', ADMOB_CONFIG.INTERSTITIAL_AD_UNIT);
    } catch (err) {
      console.error('Failed to load interstitial ad:', err);
      handleClose();
    }
  };

  const handleClose = async () => {
    trackAdClick('interstitial', ADMOB_CONFIG.INTERSTITIAL_AD_UNIT);
    
    // Record ad shown for frequency tracking
    await recordAdShown();
    
    onClose();
    if (onAdCompleted) {
      onAdCompleted();
    }
    if (onAdWatched) {
      onAdWatched();
    }
  };

  // Format time until next ad
  const formatTimeUntilNext = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {!canShowAd ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-4">
            <Clock className="w-16 h-16 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Ad Limit Reached</h3>
              <p className="text-sm text-muted-foreground">
                You've reached the maximum number of ads for now.
              </p>
              {timeUntilNextAd > 0 && (
                <p className="text-sm font-medium text-primary">
                  Next ad available in: {formatTimeUntilNext(timeUntilNextAd)}
                </p>
              )}
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        ) : isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading advertisement...</p>
          </div>
        ) : (
          <div className="relative">
            {/* Close button - only visible after countdown */}
            {canClose && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
                onClick={handleClose}
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            {/* Countdown indicator */}
            {!canClose && (
              <div className="absolute top-2 right-2 z-10 bg-background/90 rounded-full px-3 py-1">
                <span className="text-xs font-semibold">Close in {countdown}s</span>
              </div>
            )}

            {/* Simulated ad content */}
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/20 mx-auto" />
                <h3 className="text-xl font-bold text-center">Premium App</h3>
                <p className="text-sm text-center text-white/90">
                  Discover amazing features and boost your productivity
                </p>
                <Button className="w-full bg-white text-purple-600 hover:bg-white/90">
                  Learn More
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Advertisement</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}