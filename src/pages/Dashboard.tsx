
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { formatCoins } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { BannerAd } from '@/components/ads/BannerAd';
import { Coins, Gift, Image, Video, Wallet, Crown, User as UserIcon } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [showConfetti, setShowConfetti] = useState(false);

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
          console.error('Error awarding daily bonus:', error);
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold">Welcome, {profile.full_name}!</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            <div className="flex items-center gap-2">
              {profile.is_premium && (
                <div className="flex items-center gap-2 bg-premium/10 text-premium px-4 py-2 rounded-full premium-glow">
                  <Crown className="w-5 h-5" />
                  <span className="font-semibold">Premium</span>
                </div>
              )}
              <button
                onClick={() => navigate('/profile')}
                className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center shadow-lg"
              >
                <UserIcon className="w-7 h-7 text-white" />
              </button>
            </div>
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
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
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

          {!profile.is_premium && (
            <Button
              onClick={() => navigate('/premium')}
              variant="premium"
              className="h-32 flex-col gap-3 text-lg"
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
    </div>
  );
};