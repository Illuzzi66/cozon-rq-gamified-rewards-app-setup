
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { formatCoins } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { BannerAd } from '@/components/ads/BannerAd';
import { InterstitialAd } from '@/components/ads/InterstitialAd';
import { useAdTiming } from '@/hooks/useAdTiming';
import { Coins, Gift, Image, Video, Wallet, Crown, User as UserIcon, Trophy, Bell } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { shouldShowTimeAd, resetSessionTime } = useAdTiming();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showTimeAd, setShowTimeAd] = useState(false);

  // Initialize session time on mount
  useEffect(() => {
    const initSessionTime = async () => {
      if (!profile) return;
      
      // Set session start time if not already set
      if (!profile.session_start_time) {
        await supabase
          .from('profiles')
          .update({ session_start_time: new Date().toISOString() })
          .eq('user_id', profile.user_id);
        await refreshProfile();
      }
    };
    
    initSessionTime();
  }, [profile?.user_id]);

  // Check time-based ad
  useEffect(() => {
    if (shouldShowTimeAd) {
      setShowTimeAd(true);
    }
  }, [shouldShowTimeAd]);

  useEffect(() => {
    if (!profile) return;
    
    // Check daily login bonus
    const checkDailyBonus = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = profile.last_daily_login?.split('T')[0];
      
      if (lastLogin !== today) {
        try {
          const { data, error } = await supabase.rpc('award_daily_login_bonus', {
            p_user_id: profile.user_id,
          });

          if (error) throw error;

          if (data.success) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
            await refreshProfile();
          }
        } catch (error) {
          // Silent fail - user can try again later
        }
      }
    };
    
    checkDailyBonus();
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-end mb-4">
            {profile.is_premium && (
              <div className="flex items-center gap-2 bg-premium/10 text-premium px-4 py-2 rounded-full premium-glow">
                <Crown className="w-5 h-5" />
                <span className="font-semibold">Premium</span>
              </div>
            )}
            <button
              onClick={() => navigate('/profile')}
              className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center shadow-lg ml-2"
            >
              <UserIcon className="w-7 h-7 text-white" />
            </button>
          </div>

          <div className="bg-gradient-to-r from-gold/20 to-gold/10 rounded-lg p-6 border-2 border-gold/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
                <p className="text-4xl font-bold text-gold">{formatCoins(profile.coin_balance)}</p>
                {profile.locked_coins > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Locked: {formatCoins(profile.locked_coins)}
                  </p>
                )}
              </div>
              <Coins className="w-16 h-16 text-gold" />
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/tasks')}
            variant="outline"
            className="h-32 flex-col gap-3 text-lg"
          >
            <Gift className="w-8 h-8 text-accent" />
            <span>Tasks</span>
          </Button>

          <Button
            onClick={() => navigate('/spin')}
            variant="outline"
            className="h-32 flex-col gap-3 text-lg"
          >
            <span className="text-4xl">🎰</span>
            <span>Spin Wheel</span>
          </Button>

          <Button
            onClick={() => navigate('/memes')}
            variant="outline"
            className="h-32 flex-col gap-3 text-lg"
          >
            <Image className="w-8 h-8 text-secondary" />
            <span>Meme Feed</span>
          </Button>

          <Button
            onClick={() => navigate('/watch-ads')}
            variant="outline"
            className="h-32 flex-col gap-3 text-lg bg-success/5 hover:bg-success/10 border-success/20"
          >
            <Video className="w-8 h-8 text-success" />
            <span>Watch Ads</span>
            <span className="text-xs text-muted-foreground">Earn Coins</span>
          </Button>

          <Button
            onClick={() => navigate('/wallet')}
            variant="outline"
            className="h-32 flex-col gap-3 text-lg"
          >
            <Wallet className="w-8 h-8 text-success" />
            <span>Withdraw</span>
          </Button>

          <Button
            onClick={() => navigate('/leaderboard')}
            variant="outline"
            className="h-32 flex-col gap-3 text-lg bg-gradient-to-br from-yellow-500/10 to-purple-500/10 border-yellow-500/30"
          >
            <Trophy className="w-8 h-8 text-yellow-500" />
            <span>Leaderboard</span>
          </Button>

          <Button
            onClick={() => navigate('/notifications')}
            variant="outline"
            className="h-32 flex-col gap-3 text-lg"
          >
            <Bell className="w-8 h-8 text-primary" />
            <span>Notifications</span>
          </Button>

          {!profile.is_premium && (
            <Button
              onClick={() => navigate('/premium')}
              className="h-32 flex-col gap-3 text-lg bg-white text-black hover:bg-gray-100 border-2 border-black"
            >
              <Crown className="w-8 h-8" />
              <span>Go Premium</span>
              <span className="text-xs">$2 One-Time</span>
            </Button>
          )}
        </div>

        {/* Banner Ad */}
        <BannerAd className="my-4" />

        {/* Disclaimer */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-center">
          ⚠️ Earnings depend on ads and activity. Payouts subject to review and approval.
        </div>
      </div>

      {/* Time-based Ad - Show after 5 minutes */}
      <InterstitialAd
        isOpen={showTimeAd}
        onClose={async () => {
          setShowTimeAd(false);
          await resetSessionTime();
        }}
        onAdWatched={async () => {
          setShowTimeAd(false);
          await resetSessionTime();
        }}
      />
    </div>
  );
};

export default Dashboard;