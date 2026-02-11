import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { formatCoins } from '@/lib/utils';
import { Trophy, Medal, Award, Crown, Coins, Zap, ArrowLeft, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_premium: boolean;
  total_earnings: number;
  tasks_completed: number;
  spins_completed: number;
  meme_interactions: number;
  memes_posted: number;
  ads_watched: number;
  rank: number;
}

interface LeaderboardReward {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  rank: number;
  total_earnings: number;
  reward_coins: number;
  reward_spins: number;
  claimed_at: string | null;
  created_at: string;
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'alltime'>('daily');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<LeaderboardReward[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchRewards();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const functionName = activeTab === 'daily' 
        ? 'get_daily_leaderboard'
        : activeTab === 'weekly'
        ? 'get_weekly_leaderboard'
        : 'get_alltime_leaderboard';

      const { data, error } = await supabase.rpc(functionName);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('leaderboard_rewards')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const claimReward = async (rewardId: string) => {
    setClaiming(rewardId);
    try {
      const { data, error } = await supabase.rpc('claim_leaderboard_reward', {
        p_reward_id: rewardId
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Claimed ${data.coins_awarded} coins and ${data.spins_awarded} spins!`);
        fetchRewards();
        // Refresh profile to update balance
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">1st Place</Badge>;
    if (rank === 2) return <Badge className="bg-gradient-to-r from-gray-300 to-gray-500">2nd Place</Badge>;
    if (rank === 3) return <Badge className="bg-gradient-to-r from-amber-500 to-amber-700">3rd Place</Badge>;
    return <Badge variant="outline">Top 10</Badge>;
  };

  const getRewardInfo = (periodType: string, rank: number) => {
    const rewards: Record<string, Record<number, { coins: number; spins: number }>> = {
      daily: {
        1: { coins: 500, spins: 3 },
        2: { coins: 300, spins: 2 },
        3: { coins: 200, spins: 1 },
        default: { coins: 100, spins: 1 }
      },
      weekly: {
        1: { coins: 2000, spins: 10 },
        2: { coins: 1200, spins: 7 },
        3: { coins: 800, spins: 5 },
        default: { coins: 400, spins: 3 }
      },
      alltime: {
        1: { coins: 5000, spins: 25 },
        2: { coins: 3000, spins: 15 },
        3: { coins: 2000, spins: 10 },
        default: { coins: 1000, spins: 5 }
      }
    };

    return rewards[periodType]?.[rank] || rewards[periodType]?.default || { coins: 0, spins: 0 };
  };

  const userRank = leaderboard.find(entry => entry.user_id === profile?.user_id);
  const unclaimedRewards = rewards.filter(r => !r.claimed_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-4xl mx-auto p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <div className="w-10" />
        </div>

        {/* Unclaimed Rewards */}
        {unclaimedRewards.length > 0 && (
          <Card className="mb-6 border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-purple-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Unclaimed Rewards
              </CardTitle>
              <CardDescription>You have {unclaimedRewards.length} reward(s) to claim!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unclaimedRewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getRankBadge(reward.rank)}
                      <span className="text-sm text-muted-foreground capitalize">
                        {reward.period_type} Leaderboard
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-500" />
                        {formatCoins(reward.reward_coins)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-blue-500" />
                        {reward.reward_spins} spins
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => claimReward(reward.id)}
                    disabled={claiming === reward.id}
                    className="bg-gradient-to-r from-primary to-purple-600"
                  >
                    {claiming === reward.id ? 'Claiming...' : 'Claim'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* User's Current Rank */}
        {userRank && (
          <Card className="mb-6 bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background">
                    {getRankIcon(userRank.rank)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="text-2xl font-bold">#{userRank.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCoins(userRank.total_earnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="alltime">All-Time</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {/* Reward Info */}
            <Card className="bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {activeTab === 'daily' ? 'Daily' : activeTab === 'weekly' ? 'Weekly' : 'All-Time'} Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <span>🥇 1st Place:</span>
                    <span className="font-bold">{formatCoins(getRewardInfo(activeTab, 1).coins)} + {getRewardInfo(activeTab, 1).spins} spins</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <span>🥈 2nd Place:</span>
                    <span className="font-bold">{formatCoins(getRewardInfo(activeTab, 2).coins)} + {getRewardInfo(activeTab, 2).spins} spins</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <span>🥉 3rd Place:</span>
                    <span className="font-bold">{formatCoins(getRewardInfo(activeTab, 3).coins)} + {getRewardInfo(activeTab, 3).spins} spins</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <span>🏆 Top 10:</span>
                    <span className="font-bold">{formatCoins(getRewardInfo(activeTab, 10).coins)} + {getRewardInfo(activeTab, 10).spins} spins</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard List */}
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Loading leaderboard...</p>
                </CardContent>
              </Card>
            ) : leaderboard.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No data available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <Card
                    key={entry.user_id}
                    className={`transition-all hover:shadow-lg ${
                      entry.user_id === profile?.user_id
                        ? 'border-2 border-primary bg-primary/5'
                        : entry.rank <= 3
                        ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent'
                        : ''
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                          {getRankIcon(entry.rank)}
                        </div>
                        
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback>{entry.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{entry.username}</p>
                            {entry.is_premium && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                            {entry.user_id === profile?.user_id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              {formatCoins(entry.total_earnings)}
                            </span>
                            <span>{entry.tasks_completed} tasks</span>
                            <span>{entry.spins_completed} spins</span>
                          </div>
                        </div>

                        {entry.rank <= 10 && (
                          <div className="text-right">
                            {getRankBadge(entry.rank)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
