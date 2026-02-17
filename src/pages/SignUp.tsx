
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
import logo from '@/assets/screenshot_20260209-204916.png';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  
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

  // Username format validation
  const isUsernameFormatValid = useCallback((username: string) => {
    // Only alphanumeric characters, no spaces
    return /^[a-zA-Z0-9]+$/.test(username);
  }, []);

  // Generate username suggestions
  const generateUsernameSuggestions = useCallback((baseUsername: string) => {
    const suggestions: string[] = [];
    const cleanBase = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
    
    if (cleanBase.length >= 3) {
      suggestions.push(`${cleanBase}${Math.floor(Math.random() * 100)}`);
      suggestions.push(`${cleanBase}${Math.floor(Math.random() * 1000)}`);
      suggestions.push(`${cleanBase}_${Math.floor(Math.random() * 100)}`);
      suggestions.push(`the_${cleanBase}`);
      suggestions.push(`${cleanBase}_official`);
    }
    
    return suggestions.slice(0, 3);
  }, []);

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }

    // Check format first
    if (!isUsernameFormatValid(username)) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
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
        setUsernameSuggestions([]);
        return;
      }

      if (data) {
        setUsernameStatus('taken');
        setUsernameSuggestions(generateUsernameSuggestions(username));
      } else {
        setUsernameStatus('available');
        setUsernameSuggestions([]);
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
    }
  }, [isUsernameFormatValid, generateUsernameSuggestions]);

  // Debounced email availability check
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('idle');
      return;
    }

    setEmailStatus('checking');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error checking email:', error);
        setEmailStatus('idle');
        return;
      }

      setEmailStatus(data ? 'taken' : 'available');
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailStatus('idle');
    }
  }, []);

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsernameAvailability(formData.username);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, checkUsernameAvailability]);

  // Debounce email check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkEmailAvailability(formData.email);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email, checkEmailAvailability]);

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

    if (emailStatus === 'taken') {
      setError('Email is already registered');
      return;
    }

    if (emailStatus === 'checking') {
      setError('Please wait while we check email availability');
      return;
    }

    if (!isUsernameFormatValid(formData.username)) {
      setError('Username can only contain letters and numbers (no spaces or special characters)');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must meet all requirements');
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
    <div className="min-h-screen auth-bg-gradient flex items-center justify-center p-4">
      <div className="floating-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      <div className="w-full max-w-md bg-card/95 backdrop-blur-sm rounded-lg shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="Cozon RQ" 
            className="w-32 h-32 mx-auto mb-4 rounded-full shadow-lg"
          />
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
                className={`w-full px-4 py-2 pr-10 border rounded-md bg-background focus:ring-2 focus:ring-ring transition-colors ${
                  formData.username.length >= 3 && usernameStatus === 'available' 
                    ? 'border-green-500' 
                    : formData.username.length >= 3 && (usernameStatus === 'taken' || !isUsernameFormatValid(formData.username))
                    ? 'border-red-500'
                    : 'border-input'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {usernameStatus === 'available' && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
                {usernameStatus === 'taken' && (
                  <X className="w-4 h-4 text-red-600" />
                )}
                {formData.username.length >= 3 && !isUsernameFormatValid(formData.username) && usernameStatus !== 'checking' && (
                  <X className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
            
            {/* Username Status Message */}
            {formData.username.length >= 3 && (
              <div className="mt-2 text-xs">
                {usernameStatus === 'checking' && (
                  <span className="text-muted-foreground">Checking availability...</span>
                )}
                {!isUsernameFormatValid(formData.username) && usernameStatus !== 'checking' && (
                  <span className="text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Only letters and numbers allowed (no spaces or special characters)
                  </span>
                )}
                {isUsernameFormatValid(formData.username) && usernameStatus === 'available' && (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Username is available
                  </span>
                )}
                {isUsernameFormatValid(formData.username) && usernameStatus === 'taken' && (
                  <div className="space-y-2">
                    <span className="text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Username is already taken
                    </span>
                    {usernameSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-muted-foreground mb-1">Try these suggestions:</p>
                        <div className="flex flex-wrap gap-2">
                          {usernameSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setFormData({ ...formData, username: suggestion })}
                              className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
            <div className="relative">
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-2 pr-10 border rounded-md bg-background focus:ring-2 focus:ring-ring transition-colors ${
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && emailStatus === 'available' 
                    ? 'border-green-500' 
                    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && emailStatus === 'taken'
                    ? 'border-red-500'
                    : 'border-input'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {emailStatus === 'checking' && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {emailStatus === 'available' && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
                {emailStatus === 'taken' && (
                  <X className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
            
            {/* Email Status Message */}
            {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
              <div className="mt-2 text-xs">
                {emailStatus === 'checking' && (
                  <span className="text-muted-foreground">Checking availability...</span>
                )}
                {emailStatus === 'available' && (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Email is available
                  </span>
                )}
                {emailStatus === 'taken' && (
                  <span className="text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Email is already registered
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              Password
              <button
                type="button"
                onMouseEnter={() => setShowPasswordTooltip(true)}
                onMouseLeave={() => setShowPasswordTooltip(false)}
                onClick={() => setShowPasswordTooltip(!showPasswordTooltip)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </label>
            
            {/* Password Requirements Tooltip */}
            {showPasswordTooltip && (
              <div className="mb-3 p-3 bg-card border border-border rounded-lg shadow-lg">
                <p className="text-xs font-semibold mb-2 text-foreground">Password Requirements:</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>At least 8 characters long</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>One lowercase letter (a-z)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>One uppercase letter (A-Z)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>One number (0-9)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground/60 mt-0.5">•</span>
                    <span className="text-muted-foreground/80">One special character (optional, for stronger password)</span>
                  </li>
                </ul>
              </div>
            )}
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onFocus={() => setShowPasswordTooltip(true)}
                onBlur={() => setTimeout(() => setShowPasswordTooltip(false), 200)}
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

            {/* Password Requirements Checklist */}
            {formData.password && (
              <div className="mt-3 space-y-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.minLength ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <X className="w-3 h-3 text-red-600" />
                    )}
                    <span className={passwordRequirements.minLength ? 'text-green-600' : 'text-muted-foreground'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasLowercase ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <X className="w-3 h-3 text-red-600" />
                    )}
                    <span className={passwordRequirements.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}>
                      One lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasUppercase ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <X className="w-3 h-3 text-red-600" />
                    )}
                    <span className={passwordRequirements.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}>
                      One uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasNumber ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <X className="w-3 h-3 text-red-600" />
                    )}
                    <span className={passwordRequirements.hasNumber ? 'text-green-600' : 'text-muted-foreground'}>
                      One number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordRequirements.hasSpecial ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <span className="w-3 h-3" />
                    )}
                    <span className={passwordRequirements.hasSpecial ? 'text-green-600' : 'text-muted-foreground/70'}>
                      One special character (optional)
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
                className={`w-full px-4 py-2 pr-10 border rounded-md bg-background focus:ring-2 focus:ring-ring transition-colors ${
                  formData.confirmPassword && passwordsMatch
                    ? 'border-green-500'
                    : formData.confirmPassword && !passwordsMatch
                    ? 'border-red-500'
                    : 'border-input'
                }`}
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
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 text-red-600" />
                    <span className="text-red-600">Passwords do not match</span>
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

        <div className="mt-4 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
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

export default SignUp;