
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Coins, Sparkles, Video } from 'lucide-react';

interface WheelSegment {
  id: number;
  label: string;
  coins: number;
  color: string;
  probability: number;
}

const wheelSegments: WheelSegment[] = [
  { id: 0, label: '10 Coins', coins: 10, color: 'hsl(262 83% 58%)', probability: 30 },
  { id: 1, label: '25 Coins', coins: 25, color: 'hsl(217 91% 60%)', probability: 25 },
  { id: 2, label: '50 Coins', coins: 50, color: 'hsl(142 76% 36%)', probability: 20 },
  { id: 3, label: '5 Coins', coins: 5, color: 'hsl(38 92% 50%)', probability: 15 },
  { id: 4, label: '100 Coins', coins: 100, color: 'hsl(45 93% 47%)', probability: 8 },
  { id: 5, label: '15 Coins', coins: 15, color: 'hsl(0 84% 60%)', probability: 2 },
];

export const SpinWheel: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(false);
  const [spinsToday, setSpinsToday] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    checkSpinEligibility();
  }, [profile]);

  const checkSpinEligibility = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc('get_spin_count_today', {
        p_user_id: profile.user_id,
      });

      if (error) throw error;

      const count = data || 0;
      setSpinsToday(count);
      setCanSpin(count < 1);
    } catch (error) {
      console.error('Error checking spin eligibility:', error);
    }
  };

  const selectReward = (): WheelSegment => {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const segment of wheelSegments) {
      cumulative += segment.probability;
      if (random <= cumulative) {
        return segment;
      }
    }

    return wheelSegments[0];
  };

  const handleSpin = async () => {
    if (!profile || !canSpin || spinning) return;

    setSpinning(true);

    const reward = selectReward();
    const segmentAngle = 360 / wheelSegments.length;
    const targetRotation = 360 * 5 + (reward.id * segmentAngle) + segmentAngle / 2;

    setRotation(targetRotation);

    setTimeout(async () => {
      try {
        // Record spin history
        const { error: historyError } = await supabase
          .from('spin_history')
          .insert({
            user_id: profile.user_id,
            reward_type: 'coins',
            reward_amount: reward.coins,
          });

        if (historyError) throw historyError;

        // Add coins to balance
        const { error: coinsError } = await supabase.rpc('add_coins', {
          p_user_id: profile.user_id,
          p_amount: reward.coins,
        });

        if (coinsError) throw coinsError;

        setRewardAmount(reward.coins);
        setShowReward(true);
        setShowConfetti(true);
        setCanSpin(false);
        setSpinsToday(spinsToday + 1);

        await refreshProfile();

        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);

        toast({
          title: '🎉 Congratulations!',
          description: `You won ${reward.coins} coins!`,
        });
      } catch (error) {
        console.error('Error processing spin:', error);
        toast({
          title: 'Error',
          description: 'Failed to process spin. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setSpinning(false);
      }
    }, 4000);
  };

  const handleWatchAdForSpin = () => {
    toast({
      title: 'Coming Soon',
      description: 'Video ads will be available soon!',
    });
  };

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

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Daily Spin Wheel</h1>
            <p className="text-sm text-muted-foreground">
              Spins today: {spinsToday}/1 {!canSpin && '(Come back tomorrow!)'}
            </p>
          </div>
        </div>

        {/* Balance Display */}
        <Card className="p-4 bg-gradient-to-r from-gold/20 to-gold/10 border-gold/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-2xl font-bold text-gold flex items-center gap-2">
                <Coins className="w-6 h-6" />
                {profile.coin_balance.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Wheel Container */}
        <Card className="p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
          
          <div className="relative">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-destructive drop-shadow-lg" />
            </div>

            {/* Wheel */}
            <div className="relative w-full max-w-sm mx-auto aspect-square">
              <div
                className="w-full h-full rounded-full relative transition-transform duration-[4000ms] ease-out"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                }}
              >
                {wheelSegments.map((segment, index) => {
                  const angle = (360 / wheelSegments.length) * index;
                  return (
                    <div
                      key={segment.id}
                      className="absolute w-full h-full"
                      style={{
                        transform: `rotate(${angle}deg)`,
                        clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%)',
                        backgroundColor: segment.color,
                        transformOrigin: 'center',
                      }}
                    >
                      <div
                        className="absolute top-[20%] left-[60%] text-white font-bold text-sm"
                        style={{
                          transform: `rotate(${360 / wheelSegments.length / 2}deg)`,
                        }}
                      >
                        {segment.label}
                      </div>
                    </div>
                  );
                })}

                {/* Center Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-background rounded-full border-4 border-gold flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gold" />
                </div>
              </div>
            </div>

            {/* Spin Button */}
            <div className="mt-8 space-y-4">
              <Button
                onClick={handleSpin}
                disabled={!canSpin || spinning}
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                {spinning ? 'Spinning...' : canSpin ? 'SPIN NOW!' : 'No Spins Left'}
              </Button>

              {!canSpin && spinsToday >= 1 && (
                <Button
                  onClick={handleWatchAdForSpin}
                  variant="outline"
                  className="w-full h-12"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Watch Ad for Extra Spin
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Reward Display */}
        {showReward && (
          <Card className="p-6 bg-gradient-to-r from-gold/20 to-gold/10 border-2 border-gold animate-pulse">
            <div className="text-center space-y-2">
              <Sparkles className="w-12 h-12 text-gold mx-auto" />
              <h2 className="text-2xl font-bold text-gold">You Won!</h2>
              <p className="text-4xl font-bold text-gold">{rewardAmount} Coins</p>
            </div>
          </Card>
        )}

        {/* Prize List */}
        <Card className="p-6">
          <h3 className="font-bold mb-4">Possible Rewards</h3>
          <div className="space-y-2">
            {wheelSegments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: `${segment.color}20` }}
              >
                <span className="font-semibold">{segment.label}</span>
                <span className="text-sm text-muted-foreground">
                  {segment.probability}% chance
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};