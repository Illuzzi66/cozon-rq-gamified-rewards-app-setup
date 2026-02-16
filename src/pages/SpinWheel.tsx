// Spin Wheel Page - Updated with new reward segments
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

// Spin wheel page with daily bonuses, ad rewards, and coin purchases
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
  { id: 0, label: '10 Coins', rewardType: 'coins', rewardAmount: 10, color: 'hsl(262 83% 58%)', probability: 22, icon: '🪙' },
  { id: 1, label: '$0.50', rewardType: 'money', rewardAmount: 0, moneyAmount: 0.50, color: 'hsl(142 76% 36%)', probability: 15, icon: '💵' },
  { id: 2, label: '25 Coins', rewardType: 'coins', rewardAmount: 25, color: 'hsl(217 91% 60%)', probability: 18, icon: '🪙' },
  { id: 3, label: 'Try Again', rewardType: 'loss', rewardAmount: 0, rewardSubtype: 'try_again', color: 'hsl(0 84% 60%)', probability: 15, icon: '😢' },
  { id: 4, label: '+2 Spins', rewardType: 'spins', rewardAmount: 2, rewardSubtype: 'extra_spins', color: 'hsl(280 100% 70%)', probability: 10, icon: '🎰' },
  { id: 5, label: '$2.00', rewardType: 'money', rewardAmount: 0, moneyAmount: 2.00, color: 'hsl(45 93% 47%)', probability: 0.5, icon: '💰' },
  { id: 6, label: '50 Coins', rewardType: 'coins', rewardAmount: 50, color: 'hsl(38 92% 50%)', probability: 8, icon: '🪙' },
  { id: 7, label: '100 Coins', rewardType: 'coins', rewardAmount: 100, color: 'hsl(280 65% 60%)', probability: 5, icon: '💎' },
  { id: 8, label: '500 Coins', rewardType: 'coins', rewardAmount: 500, color: 'hsl(45 100% 51%)', probability: 1.5, icon: '👑' },
  { id: 9, label: 'Better Luck', rewardType: 'loss', rewardAmount: 0, rewardSubtype: 'better_luck', color: 'hsl(0 72% 51%)', probability: 5, icon: '💔' },
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
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const [adsRemaining, setAdsRemaining] = useState(5);
  const [dailyBonusAvailable, setDailyBonusAvailable] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(1);

  useEffect(() => {
    loadSpinData();
    checkDailyBonus();
    checkDailyAdCount();
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

  const checkDailyAdCount = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc('get_daily_spin_ad_count', {
        p_user_id: profile.user_id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setAdsWatchedToday(result.ads_watched_today || 0);
        setAdsRemaining(result.remaining_ads || 0);
      }
    } catch (error) {
      // Silent fail
    }
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
          
          // Show success notification
          toast({
            title: '🎉 Daily Bonus Claimed!',
            description: `You earned ${result.spins_awarded} spins!`,
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
      // Silent fail
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
    // CRITICAL: Prevent duplicate spins
    if (!profile || spinsAvailable < 1 || spinning) {
      if (spinning) {
        toast({
          title: 'Please Wait',
          description: 'Current spin is still in progress...',
          variant: 'default',
        });
      }
      console.log('❌ Cannot spin:', { 
        hasProfile: !!profile, 
        spinsAvailable, 
        spinning,
        userId: profile?.user_id 
      });
      return;
    }

    console.log('🎰 === SPIN TEST START ===');
    console.log('Initial state:', { 
      spinsAvailable, 
      spinning, 
      userId: profile.user_id,
      timestamp: new Date().toISOString()
    });
    
    setSpinning(true);
    soundEffects.playSpinSound();

    try {
      // Deduct one spin
      console.log('📞 Step 1: Calling deduct_spin RPC...');
      const { data: deductData, error: deductError } = await supabase.rpc('deduct_spin', {
        p_user_id: profile.user_id,
      });

      console.log('📥 Step 2: Deduct spin response:', { 
        data: deductData, 
        error: deductError,
        dataType: typeof deductData,
        isNull: deductData === null,
        keys: deductData ? Object.keys(deductData) : []
      });

      if (deductError) {
        throw deductError;
      }
      
      // Handle JSONB response
      const result = deductData as { success: boolean; spins_available?: number; error?: string };
      console.log('✅ Step 3: Parsed result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to deduct spin');
      }

      // Update spins immediately
      const newSpins = result.spins_available || 0;
      setSpinsAvailable(newSpins);
      console.log('✅ Step 4: Spins updated:', { 
        before: spinsAvailable, 
        after: newSpins,
        difference: spinsAvailable - newSpins
      });

      const reward = selectReward();
      console.log('🎁 Step 5: Selected reward:', {
        id: reward.id,
        label: reward.label,
        type: reward.rewardType,
        amount: reward.rewardAmount,
        moneyAmount: reward.moneyAmount,
        probability: reward.probability
      });
      
      const segmentAngle = 360 / wheelSegments.length;
      
      // Calculate rotation to align winning segment with top pointer
      const segmentCenterAngle = reward.id * segmentAngle;
      
      // Add multiple full rotations for dramatic effect (5-8 full spins)
      const fullRotations = 5 + Math.floor(Math.random() * 3);
      const targetRotation = 360 * fullRotations - segmentCenterAngle;

      console.log('🔄 Step 6: Animation details:', {
        segmentAngle,
        segmentCenterAngle,
        fullRotations,
        targetRotation,
        duration: '5s'
      });
      setRotation(targetRotation);

      setTimeout(async () => {
        try {
          console.log('📞 Step 7: Recording spin result...');
          
          // Record spin result
          const { data: recordData, error: recordError } = await supabase.rpc('record_spin_result', {
            p_user_id: profile.user_id,
            p_reward_type: reward.rewardType,
            p_reward_amount: reward.rewardAmount,
            p_reward_subtype: reward.rewardSubtype || null,
            p_money_amount: reward.moneyAmount || 0,
          });

          console.log('📥 Step 8: Record spin response:', { 
            data: recordData, 
            error: recordError,
            dataType: typeof recordData,
            isNull: recordData === null,
            keys: recordData ? Object.keys(recordData) : []
          });

          if (recordError) {
            throw recordError;
          }
          
          // Handle JSONB response
          const recordResult = recordData as { success: boolean; error?: string };
          console.log('✅ Step 9: Parsed record result:', recordResult);
          
          if (!recordResult.success) {
            throw new Error('Failed to record spin result');
          }

          console.log('🎉 Step 10: Showing reward and playing sounds...');
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

          // Refresh profile to get updated balance
          console.log('🔄 Step 11: Refreshing profile...');
          await refreshProfile();
          await loadSpinData();
          console.log('✅ Step 12: Profile and spin data refreshed');
          console.log('🎯 === SPIN TEST COMPLETE ===\n');

          // Show notification for results
          if (reward.rewardType !== 'loss') {
            const rewardText = reward.rewardType === 'coins' 
              ? `${reward.rewardAmount} coins`
              : reward.rewardType === 'money'
              ? `$${reward.moneyAmount}`
              : `${reward.rewardAmount} spins`;
            
            toast({
              title: '🎉 You Won!',
              description: `You earned ${rewardText}!`,
            });
          } else {
            toast({
              title: '😢 Oh no!',
              description: 'Better luck next time!',
              variant: 'destructive',
            });
          }
          
          console.log('✅ Spin complete!');
        } catch (error) {
          console.error('❌ Error processing spin:', error);
          
          // Check if it's a duplicate error
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Please wait for the current spin')) {
            toast({
              title: 'Too Fast!',
              description: 'Please wait for the current spin to complete.',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Please Try Again',
              description: 'Something went wrong. Try spinning again!',
              variant: 'default',
            });
          }
        } finally {
          setSpinning(false);
        }
      }, 6000);
    } catch (error) {
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
          soundEffects.playBonusSound(); // Play sound when ad completes
          return 100;
        }
        return prev + (100 / duration);
      });
    }, 1000);
  };

  const claimAdReward = async () => {
    if (!profile || !adCompleted || claimingReward) {
      console.log('❌ Cannot claim:', { 
        hasProfile: !!profile, 
        adCompleted, 
        claimingReward 
      });
      return;
    }

    setClaimingReward(true);
    console.log('🎁 === STARTING AD CLAIM ===');
    console.log('User ID:', profile.user_id);
    console.log('Current spins before claim:', spinsAvailable);

    try {
      console.log('📞 Calling record_spin_ad_view...');
      const { data, error } = await supabase.rpc('record_spin_ad_view', {
        p_user_id: profile.user_id,
        p_ad_type: 'spin_video',
        p_view_duration: 30,
      });

      console.log('📥 RPC Response:', { 
        data, 
        error,
        dataType: typeof data,
        isArray: Array.isArray(data)
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        
        // Show friendly message instead of throwing
        toast({
          title: 'Please Try Again',
          description: 'Watch another ad to earn your spins!',
          variant: 'default',
        });
        
        setWatchingAd(false);
        setAdProgress(0);
        setAdCompleted(false);
        setClaimingReward(false);
        return;
      }

      // record_spin_ad_view returns TABLE, so data is an array
      console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
      
      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        console.log('✅ Claim Result:', result);
        console.log('Success value:', result.success, 'Type:', typeof result.success);
        
        if (result.success === true || result.success === 't' || result.success === 'true') {
          // Play sound
          soundEffects.playBonusSound();

          // Show success toast
          toast({
            title: '🎉 Spins Earned!',
            description: `You earned ${result.spins_awarded || 3} spins!`,
          });

          // Reset ad UI state
          setWatchingAd(false);
          setAdProgress(0);
          setAdCompleted(false);

          // Force refresh profile and spin data
          console.log('🔄 Refreshing profile and spin data...');
          await refreshProfile();
          
          // Wait a moment for database to update
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const newSpins = await loadSpinData(true);
          console.log('✅ Spins after refresh:', newSpins);

          // Refresh ad count
          await checkDailyAdCount();
        } else {
          console.log('❌ Claim failed:', result.error);
          
          // Check if it's a limit error
          if (result.error && result.error.includes('limit')) {
            toast({
              title: 'Daily Limit Reached',
              description: 'You\'ve watched all available ads today. Come back tomorrow for more!',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Already Claimed',
              description: 'You\'ve already claimed this reward. Watch another ad to earn more spins!',
              variant: 'default',
            });
          }
          
          setWatchingAd(false);
          setAdProgress(0);
          setAdCompleted(false);
          
          // Refresh counts
          await checkDailyAdCount();
        }
      } else {
        setWatchingAd(false);
        setAdProgress(0);
        setAdCompleted(false);
      }
    } catch (error: any) {
      setWatchingAd(false);
      setAdProgress(0);
      setAdCompleted(false);
      await checkDailyAdCount();
    } finally {
      setClaimingReward(false);
    }
  };

  const handlePurchaseSpins = async () => {
    if (!profile || !purchaseAmount || purchaseAmount < 1) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid number of spins',
        variant: 'destructive',
      });
      return;
    }

    const finalCost = Math.floor((purchaseAmount || 0) * 50 * (purchaseAmount >= 20 ? 0.8 : purchaseAmount >= 10 ? 0.9 : 1));

    if (profile.coin_balance < finalCost) {
      toast({
        title: 'Insufficient Balance',
        description: `You need ${finalCost - profile.coin_balance} more coins`,
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Purchasing spins:', { user_id: profile.user_id, spin_count: purchaseAmount });

      const { data, error } = await supabase.rpc('purchase_spins_with_coins', {
        p_user_id: profile.user_id,
        p_spin_count: purchaseAmount,
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const result = data[0];
        console.log('Purchase result:', result);
        
        if (result.success) {
          soundEffects.playBonusSound();
          
          toast({
            title: '🎉 Purchase Successful!',
            description: `You bought ${result.spins_purchased} spins for ${result.coins_spent} coins!`,
          });

          // Refresh data
          await refreshProfile();
          await loadSpinData(true);
          
          // Close dialog and reset
          setShowPurchaseDialog(false);
          setPurchaseAmount(0);
        } else {
          toast({
            title: 'Purchase Not Completed',
            description: result.error || 'Please check your balance and try again.',
            variant: 'default',
          });
        }
      } else {
        console.error('No data returned from purchase');
        toast({
          title: 'Please Try Again',
          description: 'Something went wrong. Try purchasing again!',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('Error purchasing spins:', error);
      // Silent fail
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
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
                  className="w-full h-full transition-transform duration-[5000ms]"
                  viewBox="0 0 400 400"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.2))',
                    transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
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
                      disabled={adsRemaining <= 0}
                    >
                      <Video className="w-5 h-5 mr-2" />
                      Watch Ad ({adsRemaining}/5)
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
                
                {adsRemaining <= 0 && spinsAvailable < 1 && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Daily ad limit reached. Come back tomorrow or buy spins!
                  </p>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Spins</DialogTitle>
            <DialogDescription>
              Buy spins with your coins. Bulk discounts available!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Quick Select Buttons */}
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { amount: 1, discount: 0, label: '1' },
                  { amount: 5, discount: 0, label: '5' },
                  { amount: 10, discount: 10, label: '10', badge: '10% OFF' },
                  { amount: 20, discount: 20, label: '20', badge: '20% OFF' },
                ].map((option) => {
                  const cost = option.amount * 50 * (1 - option.discount / 100);
                  const canAfford = profile && profile.coin_balance >= cost;
                  return (
                    <Button
                      key={option.amount}
                      variant={purchaseAmount === option.amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPurchaseAmount(option.amount)}
                      disabled={!canAfford}
                      className={`relative ${!canAfford ? 'opacity-50' : ''}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-bold">{option.label}</span>
                        {option.badge && (
                          <span className="text-[8px] text-success font-semibold">{option.badge}</span>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="spin-amount">Custom Amount</Label>
              <Input
                id="spin-amount"
                type="number"
                min="1"
                placeholder="Enter number of spins"
                value={purchaseAmount || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setPurchaseAmount(0);
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1) {
                      setPurchaseAmount(num);
                    }
                  }
                }}
              />
            </div>

            {/* Discount Info */}
            {purchaseAmount >= 10 && (
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-success" />
                <p className="text-xs text-success font-semibold">
                  {purchaseAmount >= 20 ? '20% bulk discount applied!' : '10% bulk discount applied!'}
                </p>
              </div>
            )}
            
            {/* Cost Breakdown */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spins:</span>
                <span className="font-semibold">{purchaseAmount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base price:</span>
                <span className="font-semibold">50 coins/spin</span>
              </div>
              {purchaseAmount >= 10 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-semibold text-success">
                      -{purchaseAmount >= 20 ? '20%' : '10%'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground line-through opacity-50">
                      {(purchaseAmount || 0) * 50} coins
                    </span>
                  </div>
                </>
              )}
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between">
                <span className="font-semibold">Total Cost:</span>
                <span className="text-lg font-bold text-primary flex items-center gap-1">
                  <Coins className="w-5 h-5" />
                  {Math.floor((purchaseAmount || 0) * 50 * (purchaseAmount >= 20 ? 0.8 : purchaseAmount >= 10 ? 0.9 : 1))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Balance:</span>
                <span className={`font-semibold ${
                  profile && profile.coin_balance >= Math.floor((purchaseAmount || 0) * 50 * (purchaseAmount >= 20 ? 0.8 : purchaseAmount >= 10 ? 0.9 : 1))
                    ? 'text-success' 
                    : 'text-destructive'
                }`}>
                  {profile?.coin_balance.toLocaleString()} coins
                </span>
              </div>
              {profile && purchaseAmount > 0 && profile.coin_balance < Math.floor((purchaseAmount || 0) * 50 * (purchaseAmount >= 20 ? 0.8 : purchaseAmount >= 10 ? 0.9 : 1)) && (
                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded flex items-start gap-2">
                  <span className="text-destructive text-xs font-semibold">
                    ⚠️ Insufficient balance! You need {Math.floor((purchaseAmount || 0) * 50 * (purchaseAmount >= 20 ? 0.8 : purchaseAmount >= 10 ? 0.9 : 1)) - profile.coin_balance} more coins.
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePurchaseSpins}
              disabled={
                !profile || 
                !purchaseAmount || 
                purchaseAmount < 1 || 
                profile.coin_balance < Math.floor((purchaseAmount || 0) * 50 * (purchaseAmount >= 20 ? 0.8 : purchaseAmount >= 10 ? 0.9 : 1))
              }
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

export default SpinWheel;