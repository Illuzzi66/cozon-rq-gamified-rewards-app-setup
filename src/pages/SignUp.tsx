
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { getDeviceId } from '@/utils/deviceId';
import { Eye, EyeOff, Check, X, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const password = formData.password;
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    let label = '';
    let color = '';

    if (score < 30) {
      label = 'Weak';
      color = 'bg-destructive';
    } else if (score < 60) {
      label = 'Fair';
      color = 'bg-warning';
    } else if (score < 80) {
      label = 'Good';
      color = 'bg-primary';
    } else {
      label = 'Strong';
      color = 'bg-success';
    }

    return { score, label, color };
  }, [formData.password]);

  // Password requirements
  const passwordRequirements = useMemo(() => {
    const password = formData.password;
    return {
      minLength: password.length >= 8,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^a-zA-Z0-9]/.test(password),
    };
  }, [formData.password]);

  const isPasswordValid = useMemo(() => {
    return passwordRequirements.minLength && 
           passwordRequirements.hasLowercase && 
           passwordRequirements.hasUppercase && 
           passwordRequirements.hasNumber;
  }, [passwordRequirements]);

  // Password match validation
  const passwordsMatch = useMemo(() => {
    if (!formData.confirmPassword) return null;
    return formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error('Error checking username:', error);
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus(data ? 'taken' : 'available');
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameStatus('idle');
    }
  }, []);

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsernameAvailability(formData.username);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, checkUsernameAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    if (usernameStatus === 'taken') {
      setError('Username is already taken');
      return;
    }

    if (usernameStatus === 'checking') {
      setError('Please wait while we check username availability');
      return;
    }

    setLoading(true);

    try {
      await signUp({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        referralCode: formData.referralCode,
        deviceId: getDeviceId(),
      });
      
      // Show email verification dialog
      setShowVerificationDialog(true);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Cozon RQ</h1>
          <p className="text-muted-foreground">Start your reward quest today!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <div className="relative">
              <input
                type="text"
                required
                minLength={3}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {usernameStatus === 'available' && (
                  <Check className="w-4 h-4 text-success" />
                )}
                {usernameStatus === 'taken' && (
                  <X className="w-4 h-4 text-destructive" />
                )}
              </div>
            </div>
            
            {/* Username Status Message */}
            {formData.username.length >= 3 && (
              <div className="mt-2 text-xs">
                {usernameStatus === 'checking' && (
                  <span className="text-muted-foreground">Checking availability...</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-success flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Username is available
                  </span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Username is already taken
                  </span>
                )}
              </div>
            )}
            {formData.username.length > 0 && formData.username.length < 3 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Username must be at least 3 characters
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Password Strength:</span>
                  <span className="text-xs font-medium">{passwordStrength.label}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Password Requirements */}
            {formData.password && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Password must contain:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.minLength ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <X className="w-3 h-3 text-destructive" />
                    )}
                    <span className={passwordRequirements.minLength ? 'text-success' : 'text-muted-foreground'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasLowercase ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <X className="w-3 h-3 text-destructive" />
                    )}
                    <span className={passwordRequirements.hasLowercase ? 'text-success' : 'text-muted-foreground'}>
                      One lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasUppercase ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <X className="w-3 h-3 text-destructive" />
                    )}
                    <span className={passwordRequirements.hasUppercase ? 'text-success' : 'text-muted-foreground'}>
                      One uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasNumber ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <X className="w-3 h-3 text-destructive" />
                    )}
                    <span className={passwordRequirements.hasNumber ? 'text-success' : 'text-muted-foreground'}>
                      One number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasSpecial ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <X className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className={passwordRequirements.hasSpecial ? 'text-success' : 'text-muted-foreground'}>
                      One special character (recommended)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {passwordsMatch ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    <span className="text-success">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 text-destructive" />
                    <span className="text-destructive">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Referral Code (Optional)</label>
            <input
              type="text"
              value={formData.referralCode}
              onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
              className="w-full px-4 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full" variant="primary">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/login" className="text-primary hover:underline font-medium">
            Login
          </Link>
        </div>
      </div>

      {/* Email Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={(open) => {
        if (!open) {
          navigate('/login');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Verify Your Email</DialogTitle>
            <DialogDescription className="text-center">
              We've sent a verification link to <strong>{formData.email}</strong>. 
              Please check your inbox and click the link to verify your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground">
              <p className="mb-2">📧 Check your email inbox</p>
              <p className="mb-2">🔍 Look in spam/junk folder if not found</p>
              <p>✅ Click the verification link to activate your account</p>
            </div>

            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};