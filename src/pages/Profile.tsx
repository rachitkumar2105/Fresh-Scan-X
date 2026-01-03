import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import {
  User,
  Mail,
  Calendar,
  Save,
  Loader2,
  CheckCircle,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile.',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Passwords do not match.',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your password has been updated.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update password.',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-3">
            <User className="h-8 w-8 text-primary" />
            Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings
          </p>
        </div>

        {/* Profile Card */}
        <Card variant="glass" className="animate-scale-in">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_hsl(142_76%_45%/0.3)]">
                <User className="h-10 w-10 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>{displayName || user?.email?.split('@')[0]}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label>Member Since</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'N/A'}
              </div>
            </div>

            <Button
              onClick={saveProfile}
              variant="glow"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Security / Password Change */}
        <Card variant="default" className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              onClick={updatePassword}
              variant="outline"
              className="w-full"
              disabled={passwordLoading || !newPassword || !confirmPassword}
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card variant="default" className="animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-muted-foreground">Account Status</span>
              <span className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle className="h-4 w-4" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-muted-foreground">User ID</span>
              <span className="text-sm font-mono text-muted-foreground truncate max-w-[200px]">
                {user?.id}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-muted-foreground">Last Sign In</span>
              <span className="text-sm">
                {user?.last_sign_in_at
                  ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy h:mm a')
                  : 'N/A'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
