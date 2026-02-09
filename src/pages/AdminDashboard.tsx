
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Shield,
  Flag,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Search,
  Ban,
  UserCheck,
  Wallet,
  Clock,
} from 'lucide-react';

interface ReportedMeme {
  id: string;
  meme_id: string;
  reporter_user_id: string;
  reason: string;
  status: string;
  created_at: string;
  meme: {
    id: string;
    image_url: string;
    caption: string;
    category: string;
    user_id: string;
    created_at: string;
  };
  reporter: {
    username: string;
  };
  meme_author: {
    username: string;
  };
}

interface UserData {
  user_id: string;
  username: string;
  email: string;
  coins: number;
  is_premium: boolean;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  last_login: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: any;
  created_at: string;
  processed_at: string | null;
  user: {
    username: string;
    email: string;
  };
}

interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  totalCoins: number;
  pendingWithdrawals: number;
  totalWithdrawals: number;
  totalRevenue: number;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportedMeme[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    premiumUsers: 0,
    totalCoins: 0,
    pendingWithdrawals: 0,
    totalWithdrawals: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deletingMeme, setDeletingMeme] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [processingReport, setProcessingReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (profile && !profile.is_admin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    if (profile?.is_admin) {
      fetchAllData();
    }
  }, [profile]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchReports(),
      fetchUsers(),
      fetchWithdrawals(),
      fetchStats(),
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      // Get total users and premium users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('is_premium, coins');

      if (usersError) throw usersError;

      const totalUsers = usersData?.length || 0;
      const premiumUsers = usersData?.filter((u) => u.is_premium).length || 0;
      const totalCoins = usersData?.reduce((sum, u) => sum + (u.coins || 0), 0) || 0;

      // Get withdrawal stats
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('status, amount');

      if (withdrawalsError) throw withdrawalsError;

      const pendingWithdrawals = withdrawalsData?.filter((w) => w.status === 'pending').length || 0;
      const totalWithdrawals = withdrawalsData?.length || 0;
      const totalRevenue = withdrawalsData
        ?.filter((w) => w.status === 'completed')
        .reduce((sum, w) => sum + w.amount, 0) || 0;

      setStats({
        totalUsers,
        premiumUsers,
        totalCoins,
        pendingWithdrawals,
        totalWithdrawals,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          user:profiles(username, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withdrawals',
        variant: 'destructive',
      });
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('meme_reports')
        .select(`
          id,
          meme_id,
          reporter_user_id,
          reason,
          status,
          created_at,
          memes!inner(
            id,
            image_url,
            caption,
            category,
            user_id,
            created_at
          ),
          reporter:profiles!meme_reports_reporter_user_id_fkey(username),
          meme_author:profiles!meme_reports_meme_id_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const formattedReports = (data || []).map((report: any) => ({
        id: report.id,
        meme_id: report.meme_id,
        reporter_user_id: report.reporter_user_id,
        reason: report.reason,
        status: report.status,
        created_at: report.created_at,
        meme: report.memes,
        reporter: report.reporter,
        meme_author: report.meme_author,
      }));

      setReports(formattedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeme = async (memeId: string) => {
    if (!profile) return;

    setDeletingMeme(memeId);

    try {
      const { data, error } = await supabase.rpc('delete_meme', {
        p_user_id: profile.user_id,
        p_meme_id: memeId,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Meme Deleted',
          description: 'The meme has been removed successfully',
        });

        // Refresh reports
        await fetchReports();
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting meme:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete meme',
        variant: 'destructive',
      });
    } finally {
      setDeletingMeme(null);
      setConfirmDelete(null);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string) => {
    setProcessingReport(reportId);

    try {
      const { error } = await supabase
        .from('meme_reports')
        .update({ status })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Report Updated',
        description: `Report marked as ${status}`,
      });

      await fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update report',
        variant: 'destructive',
      });
    } finally {
      setProcessingReport(null);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: ban })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: ban ? 'User Banned' : 'User Unbanned',
        description: `User has been ${ban ? 'banned' : 'unbanned'} successfully`,
      });

      await fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleProcessWithdrawal = async (withdrawalId: string, status: 'completed' | 'rejected') => {
    setProcessingWithdrawal(withdrawalId);

    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({
        title: 'Withdrawal Updated',
        description: `Withdrawal ${status}`,
      });

      await fetchWithdrawals();
      await fetchStats();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to process withdrawal',
        variant: 'destructive',
      });
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  if (!profile?.is_admin) return null;

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const resolvedReports = reports.filter((r) => r.status === 'resolved');
  const dismissedReports = reports.filter((r) => r.status === 'dismissed');

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const completedWithdrawals = withdrawals.filter((w) => w.status === 'completed');
  const rejectedWithdrawals = withdrawals.filter((w) => w.status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage reported content</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold text-destructive">{pendingReports.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-success">{resolvedReports.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dismissed</p>
                <p className="text-2xl font-bold text-muted-foreground">{dismissedReports.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Reports Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedReports.length})
            </TabsTrigger>
            <TabsTrigger value="dismissed">
              Dismissed ({dismissedReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : pendingReports.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                <p className="text-muted-foreground">No pending reports</p>
              </Card>
            ) : (
              pendingReports.map((report) => (
                <Card key={report.id} className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Meme Preview */}
                    <div className="space-y-3">
                      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={report.meme.image_url}
                          alt={report.meme.caption}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold">
                          {report.meme.category}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Caption:</p>
                        <p className="text-sm text-muted-foreground">{report.meme.caption}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Posted by:</span>
                        <span className="font-semibold">@{report.meme_author.username}</span>
                      </div>
                    </div>

                    {/* Report Details */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Flag className="w-4 h-4 text-destructive" />
                          <span className="font-semibold">Report Details</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Reported by:</span>{' '}
                            <span className="font-semibold">@{report.reporter.username}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>{' '}
                            <span>{new Date(report.created_at).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>{' '}
                            <Badge variant="destructive">{report.status}</Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold mb-2">Reason:</p>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">{report.reason}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-4 border-t border-border">
                        <Button
                          variant="destructive"
                          onClick={() => setConfirmDelete(report.meme_id)}
                          disabled={deletingMeme === report.meme_id}
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Meme
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                            disabled={processingReport === report.id}
                          >
                            Dismiss Report
                          </Button>
                          <Button
                            variant="default"
                            onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                            disabled={processingReport === report.id}
                          >
                            Mark Resolved
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            {resolvedReports.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No resolved reports</p>
              </Card>
            ) : (
              resolvedReports.map((report) => (
                <Card key={report.id} className="p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <div>
                        <p className="text-sm font-semibold">
                          Report by @{report.reporter.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-success border-success">
                      Resolved
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="dismissed" className="space-y-4">
            {dismissedReports.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No dismissed reports</p>
              </Card>
            ) : (
              dismissedReports.map((report) => (
                <Card key={report.id} className="p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">
                          Report by @{report.reporter.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Dismissed</Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meme?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The meme and all associated data (likes, comments) will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDeleteMeme(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Meme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};