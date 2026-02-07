import React, { useState } from 'react';
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
    </div>
  );
};
