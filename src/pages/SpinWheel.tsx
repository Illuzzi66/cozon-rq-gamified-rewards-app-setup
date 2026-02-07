
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
  rewardType: 'coins' | 'money' | 'spins' | 'loss';
  rewardAmount: number;
  moneyAmount?: number;
  rewardSubtype?: string;
  color: string;
  probability: number;
  icon: string;
}

const wheelSegments: WheelSegment[] = [
  { id: 0, label: '10 Coins', rewardType: 'coins', rewardAmount: 10, color: 'hsl(262 83% 58%)', probability: 25, icon: '🪙' },
  { id: 1, label: '$0.50', rewardType: 'money', rewardAmount: 0, moneyAmount: 0.50, color: 'hsl(142 76% 36%)', probability: 15, icon: '💵' },
  { id: 2, label: '25 Coins', rewardType: 'coins', rewardAmount: 25, color: 'hsl(217 91% 60%)', probability: 20, icon: '🪙' },
  { id: 3, label: 'Try Again', rewardType: 'loss', rewardAmount: 0, rewardSubtype: 'try_again', color: 'hsl(0 84% 60%)', probability: 15, icon: '😢' },
  { id: 4, label: '+2 Spins', rewardType: 'spins', rewardAmount: 2, rewardSubtype: 'extra_spins', color: 'hsl(280 100% 70%)', probability: 10, icon: '🎰' },
  { id: 5, label: '$2.00', rewardType: 'money', rewardAmount: 0, moneyAmount: 2.00, color: 'hsl(45 93% 47%)', probability: 8, icon: '💰' },
  { id: 6, label: '50 Coins', rewardType: 'coins', rewardAmount: 50, color: 'hsl(38 92% 50%)', probability: 5, icon: '🪙' },
  { id: 7, label: 'Better Luck', rewardType: 'loss', rewardAmount: 0, rewardSubtype: 'better_luck', color: 'hsl(0 72% 51%)', probability: 2, icon: '💔' },
];

export const SpinWheel: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinsAvailable, setSpinsAvailable] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [lastReward, setLastReward] = useState<WheelSegment | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [spinHistory, setSpinHistory] = useState<any[]>([]);

  useEffect(() => {
    loadSpinData();
  }, [profile]);

  const loadSpinData = async () => {
    if (!profile) return;

    try {
      // Get spins available from profile
      setSpinsAvailable(profile.spins_available || 0);

      // Load spin history
      const { data, error } = await supabase.rpc('get_spin_history', {
        p_user_id: profile.user_id,
        p_limit: 5,
      });

      if (error) throw error;
      setSpinHistory(data || []);
    } catch (error) {
      console.error('Error loading spin data:', error);
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
    if (!profile || spinsAvailable < 1 || spinning) return;

    setSpinning(true);

    try {
      // Deduct one spin
      const { data: deductData, error: deductError } = await supabase.rpc('deduct_spin', {
        p_user_id: profile.user_id,
      });

      if (deductError) throw deductError;
      if (!deductData.success) {
        throw new Error(deductData.error || 'Failed to deduct spin');
      }

      const reward = selectReward();
      const segmentAngle = 360 / wheelSegments.length;
      const targetRotation = 360 * 8 + (reward.id * segmentAngle) + segmentAngle / 2;

      setRotation(targetRotation);

      setTimeout(async () => {
        try {
          // Record spin result
          const { data: recordData, error: recordError } = await supabase.rpc('record_spin_result', {
            p_user_id: profile.user_id,
            p_reward_type: reward.rewardType,
            p_reward_amount: reward.rewardAmount,
            p_reward_subtype: reward.rewardSubtype || null,
            p_money_amount: reward.moneyAmount || 0,
          });

          if (recordError) throw recordError;
          if (!recordData.success) {
            throw new Error('Failed to record spin result');
          }

          setLastReward(reward);
          setShowReward(true);
          
          if (reward.rewardType !== 'loss') {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          }

          setSpinsAvailable(deductData.spins_available);
          await refreshProfile();
          await loadSpinData();

          // Show appropriate toast
          let toastMessage = '';
          if (reward.rewardType === 'coins') {
            toastMessage = `You won ${reward.rewardAmount} coins!`;
          } else if (reward.rewardType === 'money') {
            toastMessage = `You won $${reward.moneyAmount?.toFixed(2)}!`;
          } else if (reward.rewardType === 'spins') {
            toastMessage = `You won ${reward.rewardAmount} extra spins!`;
          } else {
            toastMessage = 'Better luck next time!';
          }

          toast({
            title: reward.rewardType === 'loss' ? '😢 Oh no!' : '🎉 Congratulations!',
            description: toastMessage,
            variant: reward.rewardType === 'loss' ? 'destructive' : 'default',
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
      }, 5000);
    } catch (error) {
      console.error('Error deducting spin:', error);
      toast({
        title: 'Error',
        description: 'Failed to start spin. Please try again.',
        variant: 'destructive',
      });
      setSpinning(false);
    }
  };

  const handleWatchAdForSpin = () => {
    navigate('/watch-ads');
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
            <h1 className="text-2xl font-bold">Spin Wheel</h1>
            <p className="text-sm text-muted-foreground">
              Available Spins: {spinsAvailable}
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
              <svg
                className="w-full h-full transition-transform duration-[5000ms] ease-out"
                viewBox="0 0 400 400"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.2))',
                }}
              >
                {wheelSegments.map((segment, index) => {
                  const segmentAngle = 360 / wheelSegments.length;
                  const startAngle = index * segmentAngle - 90;
                  const endAngle = startAngle + segmentAngle;
                  
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  
                  const x1 = 200 + 200 * Math.cos(startRad);
                  const y1 = 200 + 200 * Math.sin(startRad);
                  const x2 = 200 + 200 * Math.cos(endRad);
                  const y2 = 200 + 200 * Math.sin(endRad);
                  
                  const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                  
                  const pathData = `M 200 200 L ${x1} ${y1} A 200 200 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                  
                  const textAngle = startAngle + segmentAngle / 2;
                  const textRad = (textAngle * Math.PI) / 180;
                  const textX = 200 + 130 * Math.cos(textRad);
                  const textY = 200 + 130 * Math.sin(textRad);
                  
                  return (
                    <g key={segment.id}>
                      <path
                        d={pathData}
                        fill={segment.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="28"
                        fontWeight="bold"
                        transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                      >
                        {segment.icon}
                      </text>
                      <text
                        x={textX}
                        y={textY + 20}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="bold"
                        transform={`rotate(${textAngle + 90}, ${textX}, ${textY + 20})`}
                      >
                        {segment.label}
                      </text>
                    </g>
                  );
                })}
                
                {/* Center Circle */}
                <circle cx="200" cy="200" r="40" fill="white" stroke="#FFD700" strokeWidth="4" />
                <text x="200" y="210" textAnchor="middle" fontSize="30" fill="#FFD700">✨</text>
              </svg>
            </div>

            {/* Spin Button */}
            <div className="mt-8 space-y-4">
              <Button
                onClick={handleSpin}
                disabled={spinsAvailable < 1 || spinning}
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                {spinning ? 'Spinning...' : spinsAvailable > 0 ? 'SPIN NOW!' : 'No Spins Left'}
              </Button>

              {spinsAvailable < 1 && (
                <Button
                  onClick={handleWatchAdForSpin}
                  variant="outline"
                  className="w-full h-12"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Watch Ad for 3 Spins
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Reward Display */}
        {showReward && lastReward && (
          <Card className={`p-6 border-2 animate-pulse ${
            lastReward.rewardType === 'loss' 
              ? 'bg-gradient-to-r from-destructive/20 to-destructive/10 border-destructive' 
              : 'bg-gradient-to-r from-gold/20 to-gold/10 border-gold'
          }`}>
            <div className="text-center space-y-2">
              <div className="text-6xl">{lastReward.icon}</div>
              <h2 className={`text-2xl font-bold ${lastReward.rewardType === 'loss' ? 'text-destructive' : 'text-gold'}`}>
                {lastReward.rewardType === 'loss' ? 'Better Luck Next Time!' : 'You Won!'}
              </h2>
              <p className={`text-3xl font-bold ${lastReward.rewardType === 'loss' ? 'text-destructive' : 'text-gold'}`}>
                {lastReward.rewardType === 'coins' && `${lastReward.rewardAmount} Coins`}
                {lastReward.rewardType === 'money' && `$${lastReward.moneyAmount?.toFixed(2)}`}
                {lastReward.rewardType === 'spins' && `+${lastReward.rewardAmount} Spins`}
                {lastReward.rewardType === 'loss' && lastReward.label}
              </p>
            </div>
          </Card>
        )}

        {/* Spin History */}
        {spinHistory.length > 0 && (
          <Card className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Recent Spins
            </h3>
            <div className="space-y-2">
              {spinHistory.map((spin) => (
                <div
                  key={spin.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {spin.reward_type === 'coins' && '🪙'}
                      {spin.reward_type === 'money' && '💰'}
                      {spin.reward_type === 'spins' && '🎰'}
                      {spin.reward_type === 'loss' && '😢'}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {spin.reward_type === 'coins' && `${spin.reward_amount} Coins`}
                        {spin.reward_type === 'money' && `$${spin.money_amount.toFixed(2)}`}
                        {spin.reward_type === 'spins' && `+${spin.reward_amount} Spins`}
                        {spin.reward_type === 'loss' && 'No Win'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(spin.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    spin.reward_type === 'loss' 
                      ? 'bg-destructive/20 text-destructive' 
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {spin.reward_type}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};