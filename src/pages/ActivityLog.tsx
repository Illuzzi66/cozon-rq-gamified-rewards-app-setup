import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Activity,
  Coins,
  CircleDot,
  CheckCircle2,
  Heart,
  MessageCircle,
  DollarSign,
  Clock,
  TrendingUp,
  Calendar,
  X,
  Wallet,
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface ActivityItem {
  user_id: string;
  activity_type: 'spin' | 'task' | 'meme' | 'withdrawal';
  description: string;
  amount: number;
  activity_date: string;
}

const activityIcons = {
  spin: CircleDot,
  task: CheckCircle2,
  meme: Heart,
  withdrawal: DollarSign,
};

const activityColors = {
  spin: 'text-purple-500',
  task: 'text-green-500',
  meme: 'text-pink-500',
  withdrawal: 'text-blue-500',
};

const activityBgColors = {
  spin: 'bg-purple-500/10',
  task: 'bg-green-500/10',
  meme: 'bg-pink-500/10',
  withdrawal: 'bg-blue-500/10',
};

const ActivityLog: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'spin' | 'task' | 'meme' | 'withdrawal'>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

  useEffect(() => {
    if (profile) {
      fetchActivities();
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
        .order('activity_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const groupActivitiesByDate = (activities: ActivityItem[]) => {
    const grouped: { [key: string]: ActivityItem[] } = {};
    
    activities.forEach((activity) => {
      const dateKey = formatDate(activity.activity_date);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });

    return grouped;
  };

  const applyDatePreset = (preset: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'today':
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'week':
        setDateRange({ from: startOfDay(subDays(now, 7)), to: endOfDay(now) });
        break;
      case 'month':
        setDateRange({ from: startOfDay(subDays(now, 30)), to: endOfDay(now) });
        break;
      case 'all':
        setDateRange({ from: undefined, to: undefined });
        break;
      case 'custom':
        // Keep current date range
        break;
    }
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
    setDatePreset('all');
  };

  const filterByDateRange = (activities: ActivityItem[]) => {
    if (!dateRange.from || !dateRange.to) {
      return activities;
    }

    return activities.filter((activity) => {
      const activityDate = new Date(activity.activity_date);
      return isWithinInterval(activityDate, { start: dateRange.from!, end: dateRange.to! });
    });
  };

  const filteredActivities = filterByDateRange(
    filter === 'all' ? activities : activities.filter(a => a.activity_type === filter)
  );

  const groupedActivities = groupActivitiesByDate(filteredActivities);

  const stats = {
    total: activities.length,
    spins: activities.filter(a => a.activity_type === 'spin').length,
    tasks: activities.filter(a => a.activity_type === 'task').length,
    memes: activities.filter(a => a.activity_type === 'meme').length,
    withdrawals: activities.filter(a => a.activity_type === 'withdrawal').length,
  };

  // Calculate total earnings for filtered activities
  const totalEarnings = filteredActivities
    .filter(a => a.activity_type !== 'withdrawal')
    .reduce((sum, activity) => sum + activity.amount, 0);

  const totalWithdrawals = filteredActivities
    .filter(a => a.activity_type === 'withdrawal')
    .reduce((sum, activity) => sum + Math.abs(activity.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Activity History
            </h1>
            <p className="text-sm text-muted-foreground">
              Track all your earnings and actions
            </p>
          </div>
        </div>

        {/* Earnings Summary */}
        <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-success/20 p-3 rounded-full">
                <Wallet className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {dateRange.from && dateRange.to 
                    ? `Earnings (${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')})`
                    : 'Total Earnings (All Time)'}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <Coins className="w-5 h-5 text-success" />
                    <span className="text-3xl font-bold text-foreground">{totalEarnings}</span>
                    <span className="text-sm text-muted-foreground ml-1">coins</span>
                  </div>
                  {totalWithdrawals > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                        <span className="text-lg font-semibold text-foreground">{totalWithdrawals}</span>
                        <span className="text-xs text-muted-foreground ml-1">withdrawn</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-success opacity-50" />
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">{stats.spins}</div>
            <div className="text-xs text-muted-foreground">Spins</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.tasks}</div>
            <div className="text-xs text-muted-foreground">Tasks</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-pink-500">{stats.memes}</div>
            <div className="text-xs text-muted-foreground">Memes</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.withdrawals}</div>
            <div className="text-xs text-muted-foreground">Withdrawals</div>
          </Card>
        </div>

        {/* Filter Buttons */}
        <Card className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Activity Type</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All Activities
              </Button>
              <Button
                variant={filter === 'spin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('spin')}
                className={filter === 'spin' ? '' : 'hover:bg-purple-500/10'}
              >
                <CircleDot className="w-4 h-4 mr-1" />
                Spins
              </Button>
              <Button
                variant={filter === 'task' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('task')}
                className={filter === 'task' ? '' : 'hover:bg-green-500/10'}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Tasks
              </Button>
              <Button
                variant={filter === 'meme' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('meme')}
                className={filter === 'meme' ? '' : 'hover:bg-pink-500/10'}
              >
                <Heart className="w-4 h-4 mr-1" />
                Memes
              </Button>
              <Button
                variant={filter === 'withdrawal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('withdrawal')}
                className={filter === 'withdrawal' ? '' : 'hover:bg-blue-500/10'}
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Withdrawals
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Date Range</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={datePreset === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyDatePreset('all')}
              >
                All Time
              </Button>
              <Button
                variant={datePreset === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyDatePreset('today')}
              >
                Today
              </Button>
              <Button
                variant={datePreset === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyDatePreset('week')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={datePreset === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyDatePreset('month')}
              >
                Last 30 Days
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={datePreset === 'custom' ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">From Date</p>
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => {
                          setDateRange({ ...dateRange, from: date ? startOfDay(date) : undefined });
                          setDatePreset('custom');
                        }}
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">To Date</p>
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => {
                          setDateRange({ ...dateRange, to: date ? endOfDay(date) : undefined });
                          setDatePreset('custom');
                        }}
                        disabled={(date) => date > new Date() || (dateRange.from ? date < dateRange.from : false)}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilter}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {dateRange.from && dateRange.to && (
              <div className="mt-2 text-sm text-muted-foreground">
                Showing activities from {format(dateRange.from, 'MMM d, yyyy')} to {format(dateRange.to, 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </Card>

        {/* Activity List */}
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No activities yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start earning by completing tasks, spinning the wheel, or interacting with memes!
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm text-muted-foreground">{date}</h3>
                    </div>
                    <div className="space-y-2">
                      {dateActivities.map((activity, index) => {
                        const Icon = activityIcons[activity.activity_type];
                        const colorClass = activityColors[activity.activity_type];
                        const bgClass = activityBgColors[activity.activity_type];

                        return (
                          <div
                            key={`${activity.activity_date}-${index}`}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className={`${bgClass} p-2 rounded-full`}>
                              <Icon className={`w-5 h-5 ${colorClass}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(activity.activity_date)}
                              </p>
                            </div>
                            {activity.amount > 0 && activity.activity_type !== 'withdrawal' && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                +{activity.amount}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {Object.keys(groupedActivities).indexOf(date) < Object.keys(groupedActivities).length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ActivityLog;
