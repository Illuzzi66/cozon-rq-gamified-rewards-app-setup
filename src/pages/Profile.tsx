import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Camera,
  LogOut,
  Save,
  Crown,
  Bell,
  Share2,
  Copy,
  Gift,
  History,
  Trash2,
  AlertTriangle,
  Users,
  TrendingUp,
  Image as ImageIcon,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [savingName, setSavingName] = useState(false);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  const [notifications, setNotifications] = useState({
    taskReminders: true,
    spinReminders: true,
    rewardAlerts: true,
    promotions: false,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [referralStats, setReferralStats] = useState<{
    total_referrals: number;
    total_earnings: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [userMemes, setUserMemes] = useState<any[]>([]);
  const [loadingMemes, setLoadingMemes] = useState(true);
  const [deletingMeme, setDeletingMeme] = useState<string | null>(null);
  const [confirmDeleteMeme, setConfirmDeleteMeme] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchReferralStats();
      fetchUserMemes();
    }
  }, [profile]);

  const fetchReferralStats = async () => {
    if (!profile) return;

    setLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('get_referral_stats', {
        user_id_param: profile.user_id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setReferralStats({
          total_referrals: Number(data[0].total_referrals),
          total_earnings: Number(data[0].total_earnings),
        });
      } else {
        setReferralStats({
          total_referrals: 0,
          total_earnings: 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching referral stats:', error);
      // Set default values on error
      setReferralStats({
        total_referrals: 0,
        total_earnings: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUserMemes = async () => {
    if (!profile) return;

    setLoadingMemes(true);
    try {
      const { data, error } = await supabase
        .from('memes')
        .select(`
          id,
          image_url,
          caption,
          category,
          created_at,
          is_active
        `)
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserMemes(data || []);
    } catch (error: any) {
      console.error('Error fetching user memes:', error);
      setUserMemes([]);
    } finally {
      setLoadingMemes(false);
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
          description: 'Your meme has been removed successfully',
        });

        // Refresh memes list
        await fetchUserMemes();
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
      setConfirmDeleteMeme(null);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!profile?.referral_code) return;
    
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      toast({
        title: 'Copied!',
        description: 'Referral code copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy referral code',
        variant: 'destructive',
      });
    }
  };

  const handleShareReferral = async () => {
    if (!profile?.referral_code) return;
    
    const shareText = `Join Cozon RQ and earn rewards! Use my referral code: ${profile.referral_code}`;
    const shareUrl = `${window.location.origin}/signup?ref=${profile.referral_code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Cozon RQ',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast({
          title: 'Copied!',
          description: 'Referral link copied to clipboard',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to share referral code',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveName = async () => {
    if (!profile || !fullName.trim() || !username.trim()) {
      toast({
        title: 'Error',
        description: 'Name and username cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });

      await refreshProfile();
      setEditingName(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all password fields',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });

      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile || !user) return;

    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: 'Error',
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    setDeletingAccount(true);
    try {
      // Call the database function to delete user data
      const { data, error: dbError } = await supabase.rpc('delete_user_account', {
        user_id_to_delete: profile.user_id,
      });

      if (dbError) throw dbError;

      if (data && !data.success) {
        throw new Error(data.message || 'Failed to delete account');
      }

      // Delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
        // If we can't delete via admin, try regular sign out
        console.error('Auth deletion error:', authError);
      }

      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted',
      });

      // Sign out and redirect
      await signOut();
      navigate('/signup');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await refreshProfile();

      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!profile || !user) return null;

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account</p>
          </div>
        </div>

        {/* Profile Picture Section */}
        <Card className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-primary/20">
                <AvatarImage src={avatarUrl} alt={profile.full_name} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Camera className="w-5 h-5" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            {uploadingPhoto && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
            {profile.is_premium && (
              <div className="flex items-center gap-2 bg-premium/10 text-premium px-4 py-2 rounded-full premium-glow">
                <Crown className="w-5 h-5" />
                <span className="font-semibold">Premium Member</span>
              </div>
            )}
          </div>
        </Card>

        {/* Account Information */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </h2>
            {!editingName && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingName(true);
                  setFullName(profile.full_name);
                  setUsername(profile.username);
                }}
              >
                Edit
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              {editingName ? (
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="text-foreground font-medium">{profile.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              {editingName ? (
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              ) : (
                <p className="text-foreground font-medium">@{profile.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <p>{profile.email}</p>
              </div>
            </div>

            {editingName && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingName ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingName(false);
                    setFullName(profile.full_name);
                    setUsername(profile.username);
                  }}
                  disabled={savingName}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </h2>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Change your account password
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                Change
              </Button>
            </div>
          </div>
        </Card>

        {/* Referral Section */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Referral Program
          </h2>

          <Separator />

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Share your referral code and earn 50 bonus coins when friends join!
              </p>
              
              {/* Referral Statistics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-full">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {loadingStats ? '...' : referralStats?.total_referrals || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Referrals</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="bg-success/20 p-2 rounded-full">
                      <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {loadingStats ? '...' : referralStats?.total_earnings || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Coins Earned</p>
                    </div>
                  </div>
                </Card>
              </div>
              
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 border-2 border-primary/20">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Your Referral Code
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background rounded-md px-4 py-3 font-mono text-xl font-bold text-primary border border-border">
                    {profile.referral_code || 'Loading...'}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyReferralCode}
                    className="h-12 w-12"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleShareReferral}
                className="w-full mt-4"
                variant="default"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Referral Code
              </Button>
            </div>
          </div>
        </Card>

        {/* My Memes Section */}
        {profile.is_premium && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  My Memes
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {userMemes.length} meme{userMemes.length !== 1 ? 's' : ''} posted
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/post-meme')}>
                Post New
              </Button>
            </div>

            <Separator />

            {loadingMemes ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Loading your memes...</p>
              </div>
            ) : userMemes.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">You haven't posted any memes yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/post-meme')}
                >
                  Post Your First Meme
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {userMemes.slice(0, 6).map((meme) => (
                  <div
                    key={meme.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                  >
                    <img
                      src={meme.image_url}
                      alt={meme.caption}
                      className="w-full h-full object-cover"
                    />
                    {!meme.is_active && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <p className="text-xs text-white font-semibold">Inactive</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDeleteMeme(meme.id)}
                        disabled={deletingMeme === meme.id}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {userMemes.length > 6 && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/meme-feed')}
              >
                View All {userMemes.length} Memes
              </Button>
            )}
          </Card>
        )}

        {/* Admin Dashboard Link */}
        {profile?.is_admin && (
          <Card className="p-6 bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Admin Dashboard</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage reported content
                  </p>
                </div>
              </div>
              <Button variant="default" onClick={() => navigate('/admin')}>
                Open Dashboard
              </Button>
            </div>
          </Card>
        )}

        {/* Activity History */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5" />
                Activity History
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                View all your earnings and actions
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/activity')}>
              View All
            </Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Task Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about new tasks
                </p>
              </div>
              <Switch
                checked={notifications.taskReminders}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, taskReminders: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Spin Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Daily spin availability alerts
                </p>
              </div>
              <Switch
                checked={notifications.spinReminders}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, spinReminders: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Reward Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Notifications for earned rewards
                </p>
              </div>
              <Switch
                checked={notifications.rewardAlerts}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, rewardAlerts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Promotions</p>
                <p className="text-sm text-muted-foreground">
                  Special offers and updates
                </p>
              </div>
              <Switch
                checked={notifications.promotions}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, promotions: checked })
                }
              />
            </div>
          </div>
        </Card>

        {/* Sign Out */}
        <Card className="p-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </Card>

        {/* Delete Account */}
        <Card className="p-6 border-destructive/50">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Once you delete your account, there is no going back. All your data, coins, and progress will be permanently deleted.
                </p>
              </div>
            </div>
            <Separator />
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Delete Account
            </Button>
          </div>
        </Card>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password below. Make sure it's at least 6 characters long.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p className="font-semibold text-foreground">
                This action cannot be undone!
              </p>
              <p>
                Deleting your account will permanently remove:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All your coins and earnings</li>
                <li>Your spin history and progress</li>
                <li>Completed tasks and rewards</li>
                <li>Meme interactions and comments</li>
                <li>Withdrawal history</li>
                <li>Premium status (if applicable)</li>
              </ul>
              <p className="font-semibold text-foreground pt-2">
                Type <span className="text-destructive font-mono">DELETE</span> to confirm:
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText('');
              }}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
            >
              {deletingAccount ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
