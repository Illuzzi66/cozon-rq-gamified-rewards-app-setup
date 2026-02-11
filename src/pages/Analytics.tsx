
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  TrendingUp,
  Coins,
  Target,
  Award,
  Calendar,
  CircleDot,
  CheckCircle2,
  Heart,
  DollarSign,
  Zap,
  Trophy,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, isToday } from 'date-fns';

interface ActivityItem {
  user_id: string;
  activity_type: 'spin' | 'task' | 'meme' | 'withdrawal';
  description: string;
  amount: number;
  activity_date: string;
}

interface TaskCompletionHistory {
  id: string;
  task_id: string;
  task_type: string;
  coins_earned: number;
  completed_at: string;
  task_title?: string;
}

interface DailyEarnings {
  date: string;
  earnings: number;
  activities: number;
}

interface ActivityBreakdown {
  name: string;
  value: number;
  earnings: number;
}

const COLORS = {
  spin: '#a855f7',
  task: '#22c55e',
  meme: '#ec4899',
  withdrawal: '#3b82f6',
};

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskCompletionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (profile) {
      fetchActivities();
      fetchTaskHistory();
    }
  }, [profile]);

  const fetchActivities = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('activity_date', { ascending: false });

      if (error) throw error;

      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskHistory = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          task_id,
          task_type,
          coins_earned,
          completed_at,
          tasks (
            title
          )
        `)
        .eq('user_id', profile.user_id)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        task_id: item.task_id,
        task_type: item.task_type,
        coins_earned: item.coins_earned,
        completed_at: item.completed_at,
        task_title: item.tasks?.title || 'Unknown Task',
      }));

      setTaskHistory(formattedData);
    } catch (error: any) {
      console.error('Error fetching task history:', error);
    }
  };

  const getFilteredActivities = () => {
    if (timeRange === 'all') return activities;

    const days = timeRange === '7d' ? 7 : 30;
    const cutoffDate = subDays(new Date(), days);

    return activities.filter(
      (activity) => new Date(activity.activity_date) >= cutoffDate
    );
  };

  const getFilteredTaskHistory = () => {
    if (timeRange === 'all') return taskHistory;

    const days = timeRange === '7d' ? 7 : 30;
    const cutoffDate = subDays(new Date(), days);

    return taskHistory.filter(
      (task) => new Date(task.completed_at) >= cutoffDate
    );
  };

  const filteredActivities = getFilteredActivities();
  const filteredTaskHistory = getFilteredTaskHistory();

  // Calculate daily earnings for chart
  const getDailyEarnings = (): DailyEarnings[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), days - 1);
    const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });

    return dateRange.map((date) => {
      const dayActivities = filteredActivities.filter((activity) => {
        const activityDate = new Date(activity.activity_date);
        return (
          activityDate.toDateString() === date.toDateString() &&
          activity.activity_type !== 'withdrawal'
        );
      });

      return {
        date: format(date, 'MMM d'),
        earnings: dayActivities.reduce((sum, a) => sum + a.amount, 0),
        activities: dayActivities.length,
      };
    });
  };

  // Calculate activity breakdown
  const getActivityBreakdown = (): ActivityBreakdown[] => {
    const breakdown: { [key: string]: { count: number; earnings: number } } = {
      spin: { count: 0, earnings: 0 },
      task: { count: 0, earnings: 0 },
      meme: { count: 0, earnings: 0 },
    };

    filteredActivities
      .filter((a) => a.activity_type !== 'withdrawal')
      .forEach((activity) => {
        breakdown[activity.activity_type].count++;
        breakdown[activity.activity_type].earnings += activity.amount;
      });

    return [
      { name: 'Spins', value: breakdown.spin.count, earnings: breakdown.spin.earnings },
      { name: 'Tasks', value: breakdown.task.count, earnings: breakdown.task.earnings },
      { name: 'Memes', value: breakdown.meme.count, earnings: breakdown.meme.earnings },
    ].filter((item) => item.value > 0);
  };

  const dailyEarnings = getDailyEarnings();
  const activityBreakdown = getActivityBreakdown();

  // Calculate statistics
  const totalEarnings = filteredActivities
    .filter((a) => a.activity_type !== 'withdrawal')
    .reduce((sum, a) => sum + a.amount, 0);

  const totalTaskEarnings = filteredTaskHistory.reduce((sum, t) => sum + t.coins_earned, 0);
  const totalTasksCompleted = filteredTaskHistory.length;

  const taskTypeBreakdown = filteredTaskHistory.reduce((acc, task) => {
    acc[task.task_type] = (acc[task.task_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalWithdrawals = filteredActivities
    .filter((a) => a.activity_type === 'withdrawal')
    .reduce((sum, a) => sum + Math.abs(a.amount), 0);

  const avgDailyEarnings =
    dailyEarnings.length > 0
      ? Math.round(
          dailyEarnings.reduce((sum, d) => sum + d.earnings, 0) / dailyEarnings.length
        )
      : 0;

  const bestDay = dailyEarnings.reduce(
    (max, day) => (day.earnings > max.earnings ? day : max),
    dailyEarnings[0] || { date: '', earnings: 0 }
  );

  const todayEarnings = dailyEarnings.find((d) => d.date === format(new Date(), 'MMM d'))?.earnings || 0;

  // Goals and achievements
  const goals = [
    {
      title: 'Daily Streak',
      description: 'Earn coins every day',
      progress: Math.min((todayEarnings / 100) * 100, 100),
      target: '100 coins',
      icon: Zap,
      color: 'text-yellow-500',
    },
    {
      title: 'Weekly Target',
      description: 'Reach 500 coins this week',
      progress: Math.min((totalEarnings / 500) * 100, 100),
      target: '500 coins',
      icon: Target,
      color: 'text-blue-500',
    },
    {
      title: 'Task Master',
      description: 'Complete 20 tasks',
      progress: Math.min(
        (activityBreakdown.find((a) => a.name === 'Tasks')?.value || 0 / 20) * 100,
        100
      ),
      target: '20 tasks',
      icon: CheckCircle2,
      color: 'text-green-500',
    },
  ];

  const achievements = [
    {
      title: 'First Spin',
      description: 'Completed your first wheel spin',
      unlocked: activityBreakdown.some((a) => a.name === 'Spins'),
      icon: CircleDot,
    },
    {
      title: 'Task Starter',
      description: 'Completed 10 tasks',
      unlocked: (activityBreakdown.find((a) => a.name === 'Tasks')?.value || 0) >= 10,
      icon: CheckCircle2,
    },
    {
      title: 'Social Butterfly',
      description: 'Interacted with 20 memes',
      unlocked: (activityBreakdown.find((a) => a.name === 'Memes')?.value || 0) >= 20,
      icon: Heart,
    },
    {
      title: 'Big Earner',
      description: 'Earned 1000 coins',
      unlocked: totalEarnings >= 1000,
      icon: Trophy,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Analytics & Insights
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your performance and achievements
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Time Range:</span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant={timeRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('7d')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={timeRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('30d')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={timeRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('all')}
              >
                All Time
              </Button>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="flex items-center justify-between mb-2">
              <Coins className="w-8 h-8 text-success" />
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">Total Earnings</p>
            <p className="text-3xl font-bold text-foreground">{totalEarnings}</p>
            <p className="text-xs text-muted-foreground mt-1">coins earned</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-blue-500" />
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground">Avg Daily</p>
            <p className="text-3xl font-bold text-foreground">{avgDailyEarnings}</p>
            <p className="text-xs text-muted-foreground mt-1">coins per day</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-purple-500" />
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground">Best Day</p>
            <p className="text-3xl font-bold text-foreground">{bestDay.earnings}</p>
            <p className="text-xs text-muted-foreground mt-1">{bestDay.date}</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-gold" />
              <Coins className="w-5 h-5 text-gold" />
            </div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold text-foreground">{profile?.coin_balance || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">available coins</p>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="earnings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earnings">Earnings Trend</TabsTrigger>
            <TabsTrigger value="breakdown">Activity Breakdown</TabsTrigger>
            <TabsTrigger value="tasks">Task History</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Daily Earnings
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--success))' }}
                    name="Coins Earned"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Activity Volume
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="activities" fill="hsl(var(--primary))" name="Activities" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Activity Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === 'Spins'
                              ? COLORS.spin
                              : entry.name === 'Tasks'
                              ? COLORS.task
                              : COLORS.meme
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Earnings by Activity</h3>
                <div className="space-y-4">
                  {activityBreakdown.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm font-bold">{item.earnings} coins</span>
                      </div>
                      <Progress
                        value={(item.earnings / totalEarnings) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {item.value} activities • {((item.earnings / totalEarnings) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Task Completion History
              </h3>
              
              {/* Task Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                  <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
                  <p className="text-2xl font-bold text-foreground">{totalTasksCompleted}</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
                  <p className="text-sm text-muted-foreground mb-1">Coins Earned</p>
                  <p className="text-2xl font-bold text-gold">{totalTaskEarnings}</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Avg per Task</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalTasksCompleted > 0 ? Math.round(totalTaskEarnings / totalTasksCompleted) : 0}
                  </p>
                </Card>
              </div>

              {/* Task Type Breakdown */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3">Tasks by Type</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Simple</p>
                    <p className="text-xl font-bold text-primary">{taskTypeBreakdown.simple || 0}</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Medium</p>
                    <p className="text-xl font-bold text-secondary">{taskTypeBreakdown.medium || 0}</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Weekly</p>
                    <p className="text-xl font-bold text-gold">{taskTypeBreakdown.weekly || 0}</p>
                  </Card>
                </div>
              </div>

              {/* Task History List */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold mb-3">Recent Completions</h4>
                {filteredTaskHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No task completions in this time period
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTaskHistory.map((task) => (
                      <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className={`w-4 h-4 ${
                                task.task_type === 'simple' ? 'text-primary' :
                                task.task_type === 'medium' ? 'text-secondary' :
                                'text-gold'
                              }`} />
                              <p className="font-semibold text-sm">{task.task_title}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="capitalize">{task.task_type}</span>
                              <span>•</span>
                              <span>{format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-gold font-bold">
                            <Coins className="w-4 h-4" />
                            <span>+{task.coins_earned}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Goals */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Your Goals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const Icon = goal.icon;
              return (
                <Card key={goal.title} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-full bg-accent`}>
                      <Icon className={`w-5 h-5 ${goal.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    </div>
                  </div>
                  <Progress value={goal.progress} className="h-2 mb-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{Math.round(goal.progress)}%</span>
                    <span className="font-medium">{goal.target}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Achievements */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <Card
                  key={achievement.title}
                  className={`p-4 text-center ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-gold/10 to-gold/5 border-gold/30'
                      : 'opacity-50'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                      achievement.unlocked ? 'bg-gold/20' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className={`w-8 h-8 ${
                        achievement.unlocked ? 'text-gold' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <p className="font-semibold text-sm mb-1">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  {achievement.unlocked && (
                    <Badge variant="secondary" className="mt-2">
                      Unlocked
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;