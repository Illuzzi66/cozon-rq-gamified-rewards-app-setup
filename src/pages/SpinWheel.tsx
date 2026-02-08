
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { RewardedVideoAd } from '@/components/ads/RewardedVideoAd';
import { ArrowLeft, Coins, Sparkles, Video, Play, CheckCircle, Clock, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { soundEffects } from '@/utils/soundEffects';

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
  const [watchingAd, setWatchingAd] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [adCompleted, setAdCompleted] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [dailyBonusAvailable, setDailyBonusAvailable] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(1);

  useEffect(() => {
    loadSpinData();
    checkDailyBonus();
  }, [profile]);

  useEffect(() => {
    if (!dailyBonusAvailable && nextClaimTime) {
      // Update immediately
      updateTimeRemaining();
      
      // Then update every second
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (dailyBonusAvailable) {
      setTimeRemaining('0h 0m 0s');
    }
  }, [dailyBonusAvailable, nextClaimTime]);

  const loadSpinData = async (forceRefresh = false) => {
    if (!profile) return;

    try {
      console.log('Loading spin data for user:', profile.user_id, 'forceRefresh:', forceRefresh);
      
      // Get latest spins available directly from database
      const query = supabase
        .from('profiles')
        .select('spins_available')
        .eq('user_id', profile.user_id)
        .single();

      const { data: profileData, error: profileError } = await query;

      if (profileError) throw profileError;
      
      const newSpins = profileData?.spins_available || 0;
      console.log('Loaded spins_available from DB:', newSpins);
      setSpinsAvailable(newSpins);

      // Load spin history
      const { data, error } = await supabase.rpc('get_spin_history', {
        p_user_id: profile.user_id,
        p_limit: 5,
      });

      if (error) throw error;
      setSpinHistory(data || []);
      
      return newSpins;
    } catch (error) {
      console.error('Error loading spin data:', error);
      return spinsAvailable;
    }
  };

  const checkDailyBonus = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc('check_daily_bonus_status', {
        p_user_id: profile.user_id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const status = data[0];
        setDailyBonusAvailable(status.available);
        
        if (!status.available && status.next_claim_time) {
          const nextTime = new Date(status.next_claim_time);
          setNextClaimTime(nextTime);
          updateTimeRemaining();
        } else if (status.available) {
          setNextClaimTime(null);
          setTimeRemaining('0h 0m 0s');
        }
      } else {
        // No data means user can claim (first time or after 24 hours)
        setDailyBonusAvailable(true);
        setNextClaimTime(null);
        setTimeRemaining('0h 0m 0s');
      }
    } catch (error) {
      console.error('Error checking daily bonus:', error);
      // On error, assume available to allow user to try
      setDailyBonusAvailable(true);
      setNextClaimTime(null);
      setTimeRemaining('0h 0m 0s');
    }
  };

  const updateTimeRemaining = () => {
    if (!nextClaimTime) {
      setTimeRemaining('0h 0m 0s');
      return;
    }

    const now = new Date();
    const diff = nextClaimTime.getTime() - now.getTime();

    if (diff <= 0) {
      setDailyBonusAvailable(true);
      setTimeRemaining('0h 0m 0s');
      setNextClaimTime(null);
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
  };

  const claimDailyBonus = async () => {
    if (!profile || !dailyBonusAvailable) return;

    try {
      soundEffects.playBonusSound();
      
      const { data, error } = await supabase.rpc('claim_daily_bonus_spins', {
        p_user_id: profile.user_id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          const newSpinCount = (profile.spins_available || 0) + result.spins_awarded;
          
          toast({
            title: '🎉 Daily Bonus Claimed!',
            description: `You received ${result.spins_awarded} spins! Total spins: ${newSpinCount}`,
          });

          // Set next claim time to 24 hours from now
          const nextTime = new Date();
          nextTime.setHours(nextTime.getHours() + 24);
          setNextClaimTime(nextTime);
          setDailyBonusAvailable(false);

          // Refresh profile first
          await refreshProfile();
          
          // Add delay to ensure data is updated
          setTimeout(async () => {
            await loadSpinData();
            await checkDailyBonus();
          }, 500);
        } else {
          toast({
            title: 'Already Claimed',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim daily bonus',
        variant: 'destructive',
      });
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
    soundEffects.playSpinSound();

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
          
          // Play appropriate sound based on reward
          if (reward.rewardType === 'loss') {
            soundEffects.playLoseSound();
          } else if (reward.rewardType === 'money' && reward.moneyAmount && reward.moneyAmount >= 2) {
            soundEffects.playBigWinSound();
          } else {
            soundEffects.playWinSound();
          }
          
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
    setWatchingAd(true);
    setAdProgress(0);
    setAdCompleted(false);

    // Simulate 30-second ad
    const duration = 30;
    const interval = setInterval(() => {
      setAdProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAdCompleted(true);
          return 100;
        }
        return prev + (100 / duration);
      });
    }, 1000);
  };

  const claimAdReward = async () => {
    if (!profile || !adCompleted || claimingReward) return;

    setClaimingReward(true);

    try {
      console.log('Claiming ad reward for user:', profile.user_id);
      
      const { data, error } = await supabase.rpc('record_spin_ad_view', {
        p_user_id: profile.user_id,
        p_ad_type: 'spin_video',
        p_view_duration: 30,
      });

      console.log('Ad claim response:', { data, error });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        console.log('Ad claim result:', result);
        
        if (result.success) {
          // Play bonus sound effect
          soundEffects.playBonus();

          // Reset ad state
          setWatchingAd(false);
          setAdProgress(0);
          setAdCompleted(false);

          // Force reload from database
          const updatedSpins = await loadSpinData(true);
          await refreshProfile();

          toast({
            title: '🎉 Reward Claimed!',
            description: `You earned ${result.spins_awarded} spins! Available: ${updatedSpins}`,
          });
        } else {
          toast({
            title: 'Limit Reached',
            description: result.error,
            variant: 'destructive',
          });
          setWatchingAd(false);
          setAdProgress(0);
          setAdCompleted(false);
        }
      } else {
        console.error('No data returned from ad claim');
        throw new Error('No data returned from server');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim reward. Please try again.',
        variant: 'destructive',
      });
      setWatchingAd(false);
      setAdProgress(0);
      setAdCompleted(false);
    } finally {
      setClaimingReward(false);
    }
  };

  const handlePurchaseSpins = async () => {
    if (!profile || purchaseAmount < 1) return;

    try {
      const { data, error } = await supabase.rpc('purchase_spins_with_coins', {
        p_user_id: profile.user_id,
        p_spin_count: purchaseAmount,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          toast({
            title: '🎉 Purchase Successful!',
            description: `You bought ${result.spins_purchased} spins for ${result.coins_spent} coins!`,
          });

          await refreshProfile();
          await loadSpinData();
          setShowPurchaseDialog(false);
          setPurchaseAmount(1);
        } else {
          toast({
            title: 'Purchase Failed',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error purchasing spins:', error);
      toast({
        title: 'Error',
        description: 'Failed to purchase spins',
        variant: 'destructive',
      });
    }
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

        {/* Daily Bonus Card */}
        <Card className="p-5 bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                Daily Bonus
              </p>
              {dailyBonusAvailable ? (
                <p className="text-sm text-success font-semibold mt-1">
                  🎁 Claim your 2 free spins now!
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">Next claim available in:</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const parts = timeRemaining.split(' ');
                      const hours = parts[0]?.replace('h', '') || '0';
                      const minutes = parts[1]?.replace('m', '') || '0';
                      const seconds = parts[2]?.replace('s', '') || '0';
                      
                      return (
                        <div className="flex items-center gap-1.5">
                          {/* Hours */}
                          <div className="flex flex-col items-center">
                            <div className="flex gap-0.5">
                              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-md px-2.5 py-1.5 min-w-[36px] text-center shadow-lg">
                                <span className="text-xl font-bold font-mono tabular-nums">
                                  {hours.padStart(2, '0')}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">Hours</span>
                          </div>
                          
                          <span className="text-2xl font-bold text-primary pb-4">:</span>
                          
                          {/* Minutes */}
                          <div className="flex flex-col items-center">
                            <div className="flex gap-0.5">
                              <div className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground rounded-md px-2.5 py-1.5 min-w-[36px] text-center shadow-lg">
                                <span className="text-xl font-bold font-mono tabular-nums">
                                  {minutes.padStart(2, '0')}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">Minutes</span>
                          </div>
                          
                          <span className="text-2xl font-bold text-primary pb-4">:</span>
                          
                          {/* Seconds */}
                          <div className="flex flex-col items-center">
                            <div className="flex gap-0.5">
                              <div className="bg-gradient-to-br from-accent to-accent/80 text-accent-foreground rounded-md px-2.5 py-1.5 min-w-[36px] text-center shadow-lg">
                                <span className="text-xl font-bold font-mono tabular-nums">
                                  {seconds.padStart(2, '0')}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">Seconds</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={claimDailyBonus}
              disabled={!dailyBonusAvailable}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary disabled:opacity-50 min-w-[120px]"
            >
              {dailyBonusAvailable ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Claim Now
                </>
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </Button>
          </div>
        </Card>

        {/* Wheel Container */}
        <Card className="p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
          
          {!watchingAd ? (
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
                  onClick={() => {
                    soundEffects.playClickSound();
                    handleSpin();
                  }}
                  disabled={spinsAvailable < 1 || spinning}
                  className="w-full h-14 text-lg font-bold"
                  size="lg"
                >
                  {spinning ? 'Spinning...' : spinsAvailable > 0 ? 'SPIN NOW!' : 'No Spins Left'}
                </Button>

                {spinsAvailable < 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleWatchAdForSpin}
                      variant="outline"
                      className="h-12"
                    >
                      <Video className="w-5 h-5 mr-2" />
                      Watch Ad
                    </Button>
                    <Button
                      onClick={() => setShowPurchaseDialog(true)}
                      variant="outline"
                      className="h-12"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Buy Spins
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative space-y-6">
              {/* Ad Video Simulation */}
              <div className="aspect-video bg-gradient-to-br from-muted to-muted-foreground/20 rounded-lg flex items-center justify-center relative overflow-hidden">
                {!adCompleted ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 animate-pulse" />
                    <div className="relative z-10 text-center">
                      <Video className="w-16 h-16 text-foreground/50 mx-auto mb-4 animate-bounce" />
                      <p className="text-lg font-semibold text-foreground/70">
                        Ad Playing...
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {Math.ceil(30 - (adProgress / 100) * 30)}s remaining
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                    <p className="text-xl font-bold text-success">Ad Complete!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Claim your reward below
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{Math.floor(adProgress)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-1000"
                    style={{ width: `${adProgress}%` }}
                  />
                </div>
              </div>

              {/* Claim Button */}
              {adCompleted ? (
                <Button
                  size="lg"
                  onClick={claimAdReward}
                  disabled={claimingReward}
                  className="w-full bg-gradient-to-r from-success to-accent"
                >
                  {claimingReward ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Claim 3 Spins
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-3">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">Please watch the entire ad</span>
                </div>
              )}

              {/* Cancel Button */}
              {!adCompleted && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setWatchingAd(false);
                    setAdProgress(0);
                    setAdCompleted(false);
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
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

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Spins</DialogTitle>
            <DialogDescription>
              Buy spins with your coins. Each spin costs 50 coins.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="spin-amount">Number of Spins</Label>
              <Input
                id="spin-amount"
                type="number"
                min="1"
                max="20"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spins:</span>
                <span className="font-semibold">{purchaseAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost per spin:</span>
                <span className="font-semibold">50 coins</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between">
                <span className="font-semibold">Total Cost:</span>
                <span className="text-lg font-bold text-primary flex items-center gap-1">
                  <Coins className="w-5 h-5" />
                  {purchaseAmount * 50}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Balance:</span>
                <span className={`font-semibold ${profile && profile.coin_balance >= purchaseAmount * 50 ? 'text-success' : 'text-destructive'}`}>
                  {profile?.coin_balance.toLocaleString()} coins
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePurchaseSpins}
              disabled={!profile || profile.coin_balance < purchaseAmount * 50}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};