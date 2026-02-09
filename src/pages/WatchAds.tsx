
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { RewardedVideoAd } from '@/components/ads/RewardedVideoAd';
import { BannerAd } from '@/components/ads/BannerAd';
import { RewardCelebration } from '@/components/ui/reward-celebration';
import { 
  ArrowLeft, 
  Video, 
  Coins,
  Play,
  CheckCircle,
  Clock,
  TrendingUp,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface AdStats {
  daily_count: number;
  daily_earnings: number;
  daily_limit: number;
  remaining: number;
}

export const WatchAds: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [balanceUpdating, setBalanceUpdating] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    amount: number;
    oldBalance: number;
    newBalance: number;
  } | null>(null);

  useEffect(() => {
    fetchStats();
  }, [profile?.coin_balance]); // Re-fetch stats when balance changes

  const fetchStats = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_daily_ad_stats', {
        p_user_id: profile.user_id,
      });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching ad stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ad statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWatchAd = () => {
    setShowRewardedAd(true);
  };

  const handleRewardEarned = async (reward: { type: string; amount: number }) => {
    if (!profile) {
      console.error('No profile found');
      return;
    }

    try {
      console.log('=== Starting ad reward claim ===');
      console.log('Current balance:', profile.coin_balance);
      console.log('Calling record_ad_view with user_id:', profile.user_id);
      
      setBalanceUpdating(true);
      
      const { data, error } = await supabase.rpc('record_ad_view', {
        p_user_id: profile.user_id,
        p_ad_type: 'video',
        p_view_duration: 15,
      });

      console.log('record_ad_view response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        setBalanceUpdating(false);
        throw error;
      }

      // record_ad_view returns JSON object directly
      if (data && data.success) {
        console.log('✅ Reward claimed successfully:', data);
        console.log('Old balance:', data.old_balance);
        console.log('New balance:', data.new_balance);
        console.log('Coins earned:', data.coins_earned);
        
        // Play win sound effect
        const { soundEffects } = await import('@/utils/soundEffects');
        soundEffects.playWinSound();
        
        // Refresh profile and stats with retry
        console.log('Refreshing profile and stats...');
        await refreshProfile();
        await fetchStats();
        
        // Force another refresh after a short delay to ensure DB has updated
        setTimeout(async () => {
          console.log('Second refresh to ensure sync...');
          await refreshProfile();
        }, 1000);
        
        console.log('Profile refreshed. New balance should be:', data.new_balance);
        
        setBalanceUpdating(false);
        
        // Then show celebration animation
        setCelebrationData({
          amount: data.coins_earned,
          oldBalance: data.old_balance,
          newBalance: data.new_balance,
        });
        setShowCelebration(true);
        console.log('=== Ad reward claim complete ===');
      } else {
        console.log('❌ Reward claim failed:', data?.error);
        setBalanceUpdating(false);
        toast({
          title: 'Limit Reached',
          description: data?.error || 'Failed to claim reward',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error claiming reward:', error);
      setBalanceUpdating(false);
      toast({
        title: 'Error',
        description: 'Failed to claim reward',
        variant: 'destructive',
      });
    }
  };

  if (!profile) return null;

  const baseReward = 5;
  const premiumReward = Math.floor(baseReward * 2.5);
  const rewardAmount = profile.is_premium ? premiumReward : baseReward;

  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/10 via-background to-primary/10">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Watch Ads</h1>
              <p className="text-sm text-muted-foreground">Earn coins by watching videos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 bg-gold/10 px-3 py-2 rounded-full transition-all ${balanceUpdating ? 'animate-pulse ring-2 ring-gold' : ''}`}>
              <Coins className="w-5 h-5 text-gold" />
              <span className="font-bold text-gold">{profile.coin_balance.toLocaleString()}</span>
              {balanceUpdating && <span className="text-xs text-gold">Updating...</span>}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                console.log('Manual refresh triggered');
                await refreshProfile();
                console.log('Profile refreshed, new balance:', profile.coin_balance);
              }}
            >
              🔄
            </Button>
          </div>
        </div>

        {/* Daily Stats */}
        {!loading && stats && (
          <Card className="p-6 bg-gradient-to-r from-destructive/10 to-primary/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.daily_count}</p>
                <p className="text-xs text-muted-foreground">Watched Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gold">{stats.daily_earnings}</p>
                <p className="text-xs text-muted-foreground">Coins Earned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{stats.remaining}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Limit</span>
                <span className="font-semibold">{stats.daily_count} / {stats.daily_limit}</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                  style={{ width: `${(stats.daily_count / stats.daily_limit) * 100}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Ad Player */}
        <Card className="p-8 text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-destructive to-primary rounded-full flex items-center justify-center">
            <Video className="w-12 h-12 text-white" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Watch & Earn</h2>
            <p className="text-muted-foreground">
              Watch a 15-second video and earn {rewardAmount} coins
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-gold">
            <Coins className="w-6 h-6" />
            <span className="text-3xl font-bold">+{rewardAmount}</span>
          </div>

          {profile.is_premium && (
            <div className="flex items-center justify-center gap-2 text-premium">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-semibold">Premium 2.5× Bonus Active!</span>
            </div>
          )}

          <Button
            size="lg"
            onClick={handleWatchAd}
            disabled={loading || (stats && stats.remaining <= 0)}
            className="w-full"
          >
            <Play className="w-5 h-5 mr-2" />
            {stats && stats.remaining <= 0 ? 'Daily Limit Reached' : 'Start Watching'}
          </Button>

          {stats && stats.remaining <= 0 && (
            <div className="flex items-center justify-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">Come back tomorrow for more ads!</span>
            </div>
          )}
        </Card>

        {/* Banner Ad */}
        <BannerAd className="my-4" />

        {/* Reward Info */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-lg">How It Works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-semibold">Watch the Video</p>
                <p className="text-sm text-muted-foreground">
                  Watch the entire 30-second ad without skipping
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-secondary">2</span>
              </div>
              <div>
                <p className="font-semibold">Claim Your Reward</p>
                <p className="text-sm text-muted-foreground">
                  Earn {rewardAmount} coins instantly after completion
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent">3</span>
              </div>
              <div>
                <p className="font-semibold">Daily Limit</p>
                <p className="text-sm text-muted-foreground">
                  Watch up to 20 ads per day to maximize earnings
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Premium Upsell */}
        {!profile.is_premium && (
          <Card className="p-6 bg-gradient-to-r from-premium/20 to-secondary/20 border-premium/30">
            <div className="text-center space-y-3">
              <TrendingUp className="w-12 h-12 text-premium mx-auto" />
              <h3 className="text-xl font-bold">Earn 2.5× More!</h3>
              <p className="text-muted-foreground">
                Premium members earn {premiumReward} coins per ad instead of {baseReward} coins
              </p>
              <Button
                onClick={() => navigate('/premium')}
                variant="premium"
                size="lg"
                className="mt-2 text-black"
              >
                Upgrade to Premium - $2
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Rewarded Video Ad Component */}
      <RewardedVideoAd
        isOpen={showRewardedAd}
        onClose={() => setShowRewardedAd(false)}
        onRewardEarned={handleRewardEarned}
        rewardAmount={rewardAmount}
        rewardType="coins"
      />

      {/* Reward Celebration Animation */}
      {celebrationData && (
        <RewardCelebration
          isOpen={showCelebration}
          rewardType="coins"
          amount={celebrationData.amount}
          oldBalance={celebrationData.oldBalance}
          newBalance={celebrationData.newBalance}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
};