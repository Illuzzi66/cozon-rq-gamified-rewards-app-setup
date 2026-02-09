
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
  Settings,
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
  account_status?: string;
  suspension_until?: string;
  ban_reason?: string;
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
  admin_id: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
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
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banType, setBanType] = useState<'suspend' | 'ban'>('suspend');
  const [banReason, setBanReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('24');
  const [processingBan, setProcessingBan] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [unbanReason, setUnbanReason] = useState('');
  const [processingUnban, setProcessingUnban] = useState(false);

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

  const handleProcessWithdrawal = async (withdrawalId: string, status: 'completed' | 'rejected') => {
    setProcessingWithdrawal(withdrawalId);

    try {
      const withdrawal = withdrawals.find(w => w.id === withdrawalId);
      if (!withdrawal) return;

      const { error } = await supabase
        .from('withdrawals')
        .update({
          status,
          admin_id: profile?.user_id,
          reviewed_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      // Create notification for user
      if (status === 'completed') {
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal_approved',
          title: '🎉 Withdrawal Approved!',
          message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been approved and will be processed shortly.`,
          data: {
            withdrawal_id: withdrawalId,
            amount: withdrawal.amount,
          },
        });
      } else {
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal_rejected',
          title: 'Withdrawal Rejected',
          message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} was rejected. Please contact support for details.`,
          data: {
            withdrawal_id: withdrawalId,
            amount: withdrawal.amount,
          },
        });
      }

      toast({
        title: status === 'completed' ? 'Withdrawal Approved' : 'Withdrawal Rejected',
        description: status === 'completed'
          ? 'The withdrawal has been approved and user will be notified.'
          : 'The withdrawal has been rejected and user will be notified.',
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

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason',
        variant: 'destructive',
      });
      return;
    }

    setProcessingBan(true);
    try {
      const suspensionUntil = banType === 'suspend' 
        ? new Date(Date.now() + parseInt(suspensionDuration) * 60 * 60 * 1000).toISOString()
        : null;

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          account_status: banType === 'ban' ? 'banned' : 'suspended',
          suspension_until: suspensionUntil,
          ban_reason: banReason,
          banned_by: profile?.user_id,
          banned_at: new Date().toISOString(),
        })
        .eq('user_id', selectedUser.user_id);

      if (profileError) throw profileError;

      // Record in ban history
      const { error: banError } = await supabase
        .from('user_bans')
        .insert({
          user_id: selectedUser.user_id,
          banned_by: profile?.user_id,
          ban_type: banType,
          reason: banReason,
          duration_hours: banType === 'suspend' ? parseInt(suspensionDuration) : null,
        });

      if (banError) throw banError;

      toast({
        title: 'User Updated',
        description: `User has been ${banType === 'ban' ? 'banned' : 'suspended'}`,
      });

      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason('');
      await fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setProcessingBan(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser || !unbanReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for unbanning',
        variant: 'destructive',
      });
      return;
    }

    setProcessingUnban(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          account_status: 'active',
          suspension_until: null,
          ban_reason: null,
        })
        .eq('user_id', selectedUser.user_id);

      if (profileError) throw profileError;

      // Mark ban as inactive with reason
      const { error: banError } = await supabase
        .from('user_bans')
        .update({
          is_active: false,
          unbanned_at: new Date().toISOString(),
          unbanned_by: profile?.user_id,
          unban_reason: unbanReason,
        })
        .eq('user_id', selectedUser.user_id)
        .eq('is_active', true);

      if (banError) throw banError;

      toast({
        title: 'User Unbanned',
        description: 'User account has been restored',
      });

      setUnbanDialogOpen(false);
      setSelectedUser(null);
      setUnbanReason('');
      await fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unban user',
        variant: 'destructive',
      });
    } finally {
      setProcessingUnban(false);
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
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Control Panel</h1>
                <p className="text-sm text-muted-foreground">Manage users, payments, and platform operations</p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate('/admin/settings')} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Premium Users</p>
                <p className="text-2xl font-bold text-accent">{stats.premiumUsers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-accent" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Coins</p>
                <p className="text-2xl font-bold text-warning">{stats.totalCoins.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-warning" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-destructive">{stats.pendingWithdrawals}</p>
              </div>
              <Clock className="w-8 h-8 text-destructive" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Withdrawals</p>
                <p className="text-2xl font-bold">{stats.totalWithdrawals}</p>
              </div>
              <Wallet className="w-8 h-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold text-destructive">{pendingReports.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawals">
              <Wallet className="w-4 h-4 mr-2" />
              Withdrawals ({pendingWithdrawals.length})
            </TabsTrigger>
            <TabsTrigger value="reports">
              <Flag className="w-4 h-4 mr-2" />
              Reports ({pendingReports.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">New Users (24h)</span>
                    <span className="font-semibold">{users.filter(u => new Date(u.created_at) > new Date(Date.now() - 86400000)).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Premium</span>
                    <span className="font-semibold text-accent">{stats.premiumUsers}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending Actions</span>
                    <span className="font-semibold text-destructive">{stats.pendingWithdrawals + pendingReports.length}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Platform Coins</span>
                    <span className="font-semibold">{stats.totalCoins.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completed Withdrawals</span>
                    <span className="font-semibold text-success">${(stats.totalRevenue / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending Payouts</span>
                    <span className="font-semibold text-warning">
                      ${(pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Coins</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">@{user.username}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-warning">{user.coins}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.is_premium && <Badge variant="default">Premium</Badge>}
                            {user.is_admin && <Badge variant="secondary">Admin</Badge>}
                            {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!user.is_admin && (
                              <>
                                {(user.account_status === 'banned' || user.account_status === 'suspended') ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setUnbanDialogOpen(true);
                                    }}
                                    className="text-success border-success hover:bg-success/10"
                                  >
                                    <UserCheck className="w-4 h-4 mr-1" />
                                    Unban
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setBanDialogOpen(true);
                                    }}
                                    className="text-destructive border-destructive hover:bg-destructive/10"
                                  >
                                    <Ban className="w-4 h-4 mr-1" />
                                    Ban
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending">Pending ({pendingWithdrawals.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedWithdrawals.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedWithdrawals.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingWithdrawals.length === 0 ? (
                  <Card className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending withdrawals</p>
                  </Card>
                ) : (
                  pendingWithdrawals.map((withdrawal) => (
                    <Card key={withdrawal.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">@{withdrawal.user.username}</span>
                            <Badge variant="outline">{withdrawal.payment_method}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{withdrawal.user.email}</p>
                          <div className="text-2xl font-bold text-success">
                            ${(withdrawal.amount / 100).toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Requested: {new Date(withdrawal.created_at).toLocaleString()}
                          </p>
                          {withdrawal.payment_details && (
                            <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                              <p className="font-semibold mb-1">Payment Details:</p>
                              <pre className="text-xs">{JSON.stringify(withdrawal.payment_details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleProcessWithdrawal(withdrawal.id, 'completed')}
                            disabled={processingWithdrawal === withdrawal.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleProcessWithdrawal(withdrawal.id, 'rejected')}
                            disabled={processingWithdrawal === withdrawal.id}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {completedWithdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">@{withdrawal.user.username}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(withdrawal.amount / 100).toFixed(2)} • {new Date(withdrawal.processed_at!).toLocaleDateString()}
                        </p>
                        {withdrawal.admin_note && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <span className="font-semibold">Admin Note:</span> {withdrawal.admin_note}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-success border-success">Approved</Badge>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                {rejectedWithdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">@{withdrawal.user.username}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(withdrawal.amount / 100).toFixed(2)} • {new Date(withdrawal.processed_at!).toLocaleDateString()}
                        </p>
                        {withdrawal.admin_note && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <span className="font-semibold">Reason:</span> {withdrawal.admin_note}
                          </div>
                        )}
                      </div>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* User Management Dialog */}
      <AlertDialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manage User: @{selectedUser?.username}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 mt-4">
                <div className="flex justify-between text-sm">
                  <span>Email:</span>
                  <span className="font-semibold">{selectedUser?.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Coins:</span>
                  <span className="font-semibold text-warning">{selectedUser?.coins}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <div className="flex gap-1">
                    {selectedUser?.is_premium && <Badge variant="default">Premium</Badge>}
                    {selectedUser?.is_admin && <Badge variant="secondary">Admin</Badge>}
                    {selectedUser?.is_banned && <Badge variant="destructive">Banned</Badge>}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Joined:</span>
                  <span>{selectedUser && new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {selectedUser && !selectedUser.is_admin && (
              <AlertDialogAction
                onClick={() => handleBanUser(selectedUser.user_id, !selectedUser.is_banned)}
                className={selectedUser.is_banned ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
              >
                {selectedUser.is_banned ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Unban User
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Ban User
                  </>
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban User Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User: @{selectedUser?.username}</AlertDialogTitle>
            <AlertDialogDescription>
              Choose the type of ban and provide a reason. This action will restrict the user's access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Ban Type</label>
              <Select value={banType} onValueChange={(value: 'suspend' | 'ban') => setBanType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspend">Temporary Suspension</SelectItem>
                  <SelectItem value="ban">Permanent Ban</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {banType === 'suspend' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Duration (hours)</label>
                <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">Reason *</label>
              <Input
                placeholder="Enter reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBanReason('');
              setBanType('suspend');
              setSuspensionDuration('24');
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              disabled={processingBan || !banReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processingBan ? 'Processing...' : `${banType === 'ban' ? 'Ban' : 'Suspend'} User`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unban User Dialog */}
      <AlertDialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban User: @{selectedUser?.username}</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for unbanning this user. Their account will be restored to active status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {selectedUser?.ban_reason && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Original Ban Reason</label>
                <div className="bg-muted p-3 rounded-lg text-sm">
                  {selectedUser.ban_reason}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">Unban Reason *</label>
              <Input
                placeholder="Enter reason for unbanning..."
                value={unbanReason}
                onChange={(e) => setUnbanReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnbanReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnbanUser}
              disabled={processingUnban || !unbanReason.trim()}
              className="bg-success hover:bg-success/90"
            >
              {processingUnban ? 'Processing...' : 'Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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