
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Gift, X, Clock } from 'lucide-react';
import { ADMOB_CONFIG, trackAdImpression, trackAdReward, simulateAdLoad } from '@/lib/admob';
import { Progress } from '@/components/ui/progress';
import { useAdFrequency } from '@/hooks/useAdFrequency';

interface RewardedVideoAdProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: (reward: { type: string; amount: number }) => Promise<void>;
  rewardAmount?: number;
  rewardType?: string;
}

export function RewardedVideoAd({
  isOpen,
  onClose,
  onRewardEarned,
  rewardAmount = 10,
  rewardType = 'coins',
}: RewardedVideoAdProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const { canShowAd, timeUntilNextAd, recordAdShown } = useAdFrequency();

  const VIDEO_DURATION = 15; // 15 seconds

  useEffect(() => {
    if (isOpen) {
      if (canShowAd) {
        loadAd();
      }
    } else {
      // Reset state when dialog closes
      setIsLoading(true);
      setIsPlaying(false);
      setProgress(0);
      setIsCompleted(false);
      setIsClaiming(false);
    }
  }, [isOpen, canShowAd]);

  useEffect(() => {
    if (isPlaying && progress < 100) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / VIDEO_DURATION);
          if (newProgress >= 100) {
            setIsPlaying(false);
            setIsCompleted(true);
            trackAdReward('rewarded', rewardAmount);
            return 100;
          }
          return newProgress;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, progress, rewardAmount]);

  const loadAd = async () => {
    setIsLoading(true);
    try {
      await simulateAdLoad(1500);
      setIsLoading(false);
      trackAdImpression('rewarded', ADMOB_CONFIG.REWARDED_AD_UNIT);
    } catch (err) {
      console.error('Failed to load rewarded ad:', err);
      onClose();
    }
  };

  const handlePlayVideo = () => {
    setIsPlaying(true);
  };

  const handleClaimReward = async () => {
    if (isClaiming) {
      console.log('Already claiming, preventing double-claim');
      return; // Prevent double-claiming
    }
    
    console.log('Starting reward claim process...');
    setIsClaiming(true);
    try {
      await recordAdShown();
      console.log('Ad shown recorded, calling onRewardEarned...');
      await onRewardEarned({ type: rewardType, amount: rewardAmount });
      console.log('Reward earned callback completed, waiting for profile update...');
      // Wait longer to ensure profile updates complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Closing ad dialog');
      onClose();
    } catch (error) {
      console.error('Error in handleClaimReward:', error);
      setIsClaiming(false);
    }
  };

  const handleSkip = () => {
    if (isCompleted) {
      handleClaimReward();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleSkip}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Watch Ad to Earn Reward
          </DialogTitle>
        </DialogHeader>

        {!canShowAd ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">Ad Limit Reached</h3>
            <p className="text-center text-muted-foreground">
              {timeUntilNextAd > 0
                ? `Please wait ${Math.floor(timeUntilNextAd / 60)} minutes before watching another ad.`
                : 'You\'ve reached your daily ad limit. Try again tomorrow!'}
            </p>
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        ) : isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading video ad...</p>
          </div>
        ) : isCompleted ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold">Congratulations!</h3>
            <p className="text-center text-muted-foreground">
              You've earned {rewardAmount} {rewardType}!
            </p>
            <Button 
              onClick={handleClaimReward} 
              className="w-full" 
              size="lg" 
              disabled={isClaiming}
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Claiming...
                </>
              ) : (
                'Claim Reward'
              )}
            </Button>
          </div>
        ) : !isPlaying ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Watch a {VIDEO_DURATION}-second video</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Earn {rewardAmount} {rewardType} as reward
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePlayVideo} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Watch Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video player simulation */}
            <div className="bg-black rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 animate-pulse" />
              <div className="relative z-10 text-white text-center space-y-2">
                <Play className="w-12 h-12 mx-auto" />
                <p className="text-sm font-semibold">Video Playing...</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{Math.floor((progress / 100) * VIDEO_DURATION)}s / {VIDEO_DURATION}s</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Watch the entire video to earn your reward
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}