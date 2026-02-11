
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Coins, 
  Calendar, 
  Share2, 
  UserPlus, 
  User, 
  Video, 
  Disc, 
  Trophy, 
  Heart, 
  Users,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: 'simple' | 'medium' | 'weekly';
  reward_coins: number;
  icon: string;
  is_active: boolean;
}

interface TaskCompletion {
  task_id: string;
  task_type: 'simple' | 'medium' | 'weekly';
  completed_at: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Share2,
  UserPlus,
  User,
  Video,
  Disc,
  Trophy,
  Heart,
  Users,
};

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchCompletions();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('task_type', { ascending: true })
        .order('reward_coins', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletions = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select('task_id, task_type, completed_at')
        .eq('user_id', profile.user_id);

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      // Silent fail
    }
  };

  const isTaskCompleted = (task: Task): boolean => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    return completions.some((completion) => {
      // Check if this specific task was completed
      if (completion.task_id !== task.id) return false;

      const completionDate = new Date(completion.completed_at);

      if (task.task_type === 'weekly') {
        return completionDate >= startOfWeek;
      } else {
        const completionDateStr = completion.completed_at.split('T')[0];
        return completionDateStr === today;
      }
    });
  };

  const handleCompleteTask = async (task: Task) => {
    if (!profile) return;
    
    // CRITICAL: Prevent duplicate submissions
    if (completingTask) {
      toast({
        title: 'Please Wait',
        description: 'Processing your previous task...',
        variant: 'default',
      });
      return;
    }

    setCompletingTask(task.id);

    try {
      console.log('Completing task:', { task_id: task.id, user_id: profile.user_id });
      
      const { data, error } = await supabase.rpc('complete_task', {
        p_user_id: profile.user_id,
        p_task_id: task.id,
      });

      console.log('Complete task response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (data?.success) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);

        toast({
          title: '🎉 Task Completed!',
          description: `You earned ${data.reward} coins${data.spins_awarded ? ` and ${data.spins_awarded} spins` : ''}!${data.is_premium ? ' (Premium 2.5× bonus applied)' : ''}`,
        });

        await fetchCompletions();
        await refreshProfile();
      } else {
        console.warn('Task completion failed:', data);
        toast({
          title: 'Cannot Complete',
          description: data?.error || 'Task already completed for this period',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Silent fail
    } finally {
      setCompletingTask(null);
    }
  };

  const renderTask = (task: Task) => {
    const Icon = iconMap[task.icon] || Sparkles;
    const completed = isTaskCompleted(task);
    const baseReward = task.reward_coins;
    const premiumReward = Math.floor(baseReward * 2.5);

    return (
      <Card key={task.id} className="p-4 hover:shadow-lg transition-shadow">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${
            task.task_type === 'simple' ? 'bg-primary/10' :
            task.task_type === 'medium' ? 'bg-secondary/10' :
            'bg-gold/10'
          }`}>
            <Icon className={`w-6 h-6 ${
              task.task_type === 'simple' ? 'text-primary' :
              task.task_type === 'medium' ? 'text-secondary' :
              'text-gold'
            }`} />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{task.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-gold" />
                <span className="font-bold text-gold">
                  {baseReward}
                  {profile?.is_premium && (
                    <span className="text-sm ml-1">→ {premiumReward}</span>
                  )}
                </span>
              </div>

              {completed ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Completed</span>
                </div>
              ) : (
                <Button
                  onClick={() => handleCompleteTask(task)}
                  disabled={completingTask === task.id}
                  size="sm"
                >
                  {completingTask === task.id ? 'Processing...' : 'Complete'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (!profile) return null;

  const simpleTasks = tasks.filter((t) => t.task_type === 'simple');
  const mediumTasks = tasks.filter((t) => t.task_type === 'medium');
  const weeklyTasks = tasks.filter((t) => t.task_type === 'weekly');

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Tasks & Challenges</h1>
            <p className="text-sm text-muted-foreground">Complete tasks to earn coins</p>
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
            {profile.is_premium && (
              <div className="bg-premium/10 text-premium px-4 py-2 rounded-full text-sm font-semibold">
                2.5× Earnings Active
              </div>
            )}
          </div>
        </Card>

        {/* Tasks Tabs */}
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simple">
              Simple ({simpleTasks.length})
            </TabsTrigger>
            <TabsTrigger value="medium">
              Medium ({mediumTasks.length})
            </TabsTrigger>
            <TabsTrigger value="weekly">
              Weekly ({weeklyTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>Resets daily at midnight</span>
            </div>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading tasks...</p>
            ) : simpleTasks.length === 0 ? (
              <p className="text-center text-muted-foreground">No simple tasks available</p>
            ) : (
              simpleTasks.map(renderTask)
            )}
          </TabsContent>

          <TabsContent value="medium" className="space-y-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>Resets daily at midnight</span>
            </div>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading tasks...</p>
            ) : mediumTasks.length === 0 ? (
              <p className="text-center text-muted-foreground">No medium tasks available</p>
            ) : (
              mediumTasks.map(renderTask)
            )}
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>Resets every Monday</span>
            </div>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading tasks...</p>
            ) : weeklyTasks.length === 0 ? (
              <p className="text-center text-muted-foreground">No weekly tasks available</p>
            ) : (
              weeklyTasks.map(renderTask)
            )}
          </TabsContent>
        </Tabs>

        {/* Premium Upsell */}
        {!profile.is_premium && (
          <Card className="p-6 bg-gradient-to-r from-premium/20 to-secondary/20 border-premium/30">
            <div className="text-center space-y-3">
              <Sparkles className="w-12 h-12 text-premium mx-auto" />
              <h3 className="text-xl font-bold">Upgrade to Premium</h3>
              <p className="text-muted-foreground">
                Earn 2.5× coins on all tasks! Just $2 one-time payment.
              </p>
              <Button
                onClick={() => navigate('/premium')}
                size="lg"
                className="mt-2 bg-white text-black hover:bg-gray-100 border-2 border-black"
              >
                Go Premium Now
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tasks;