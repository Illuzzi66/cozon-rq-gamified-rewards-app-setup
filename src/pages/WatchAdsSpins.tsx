
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Video, 
  Play,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface AdStats {
  daily_count: number;
  daily_limit: number;
  remaining: number;
}

export const WatchAdsSpins: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [adCompleted, setAdCompleted] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_daily_spin_ad_stats', {
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

  const simulateAdWatch = () => {
    setWatching(true);
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

  const claimReward = async () => {
    if (!profile || !adCompleted) return;

    try {
      const { data, error } = await supabase.rpc('record_spin_ad_view', {
        p_user_id: profile.user_id,
        p_ad_type: 'spin_video',
        p_view_duration: 30,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '🎉 Reward Claimed!',
          description: `You earned ${data.spins_awarded} spins!`,
        });

        await refreshProfile();
        await fetchStats();
        setWatching(false);
        setAdProgress(0);
        setAdCompleted(false);
      } else {
        toast({
          title: 'Limit Reached',
          description: data.error,
          variant: 'destructive',
        });
        setWatching(false);
        setAdProgress(0);
        setAdCompleted(false);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim reward',
        variant: 'destructive',
      });
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Watch Ad for Spins</h1>
              <p className="text-sm text-muted-foreground">Earn spins by watching videos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-full">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary">{profile.spins_available}</span>
          </div>
        </div>

        {/* Daily Stats */}
        {!loading && stats && (
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.daily_count}</p>
                <p className="text-xs text-muted-foreground">Watched Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.daily_count * 3}</p>
                <p className="text-xs text-muted-foreground">Spins Earned</p>
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
        {!watching ? (
          <Card className="p-8 text-center space-y-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
              <Video className="w-12 h-12 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Watch & Spin</h2>
              <p className="text-muted-foreground">
                Watch a 30-second video and earn 3 spins
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-primary">
              <span className="text-5xl font-bold">+3</span>
              <span className="text-4xl">🎰</span>
            </div>

            <Button
              size="lg"
              onClick={simulateAdWatch}
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
        ) : (
          <Card className="p-8 space-y-6">
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
            {adCompleted && (
              <Button
                size="lg"
                onClick={claimReward}
                className="w-full bg-gradient-to-r from-success to-accent"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Claim 3 Spins
              </Button>
            )}

            {!adCompleted && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Please watch the entire ad</span>
              </div>
            )}
          </Card>
        )}

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
                  Earn 3 spins instantly after completion
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
                  Watch up to 10 ads per day to earn spins
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};