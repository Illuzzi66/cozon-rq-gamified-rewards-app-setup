
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Crown,
  Check,
  Zap,
  TrendingUp,
  Clock,
  Shield,
  Star,
  Sparkles,
} from 'lucide-react';

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export const Premium: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  const PREMIUM_PRICE_USD = 2;
  const PREMIUM_PRICE_NGN = PREMIUM_PRICE_USD * 100 * 100; // Convert to kobo (NGN 200 = $2 at 100 rate)
  const PAYSTACK_PUBLIC_KEY = 'pk_test_your_paystack_public_key'; // Replace with actual key

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    // Redirect if already premium
    if (profile?.is_premium) {
      toast({
        title: '✨ Already Premium',
        description: "You're already enjoying premium benefits!",
      });
      navigate('/dashboard');
    }
  }, [profile]);

  const handleUpgrade = async () => {
    if (!profile || !paystackLoaded || loading) return;

    try {
      setLoading(true);

      // Generate unique reference
      const reference = `PREMIUM_${profile.user_id}_${Date.now()}`;

      // Record purchase attempt
      const { data: recordData, error: recordError } = await supabase.rpc(
        'record_premium_purchase',
        {
          p_user_id: profile.user_id,
          p_amount_usd: PREMIUM_PRICE_USD,
          p_paystack_reference: reference,
        }
      );

      if (recordError) throw recordError;

      if (!recordData.success) {
        toast({
          title: 'Error',
          description: recordData.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Initialize Paystack payment
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: profile.email,
        amount: PREMIUM_PRICE_NGN,
        currency: 'NGN',
        ref: reference,
        onClose: () => {
          setLoading(false);
          toast({
            title: 'Payment Cancelled',
            description: 'You closed the payment window',
          });
        },
        callback: async (response) => {
          // Verify payment
          await verifyPayment(response.reference);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate payment',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      // Call edge function to verify payment
      const { data, error } = await supabase.functions.invoke(
        'verify-paystack-payment',
        {
          body: {
            reference,
            userId: profile?.user_id,
          },
        }
      );

      if (error) throw error;

      if (data.success) {
        toast({
          title: '🎉 Welcome to Premium!',
          description: 'Your account has been upgraded successfully',
        });

        // Refresh profile
        await refreshProfile();

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        toast({
          title: 'Verification Failed',
          description: data.error || 'Payment could not be verified',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify payment. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const benefits = [
    {
      icon: TrendingUp,
      title: '2.5× Earnings Multiplier',
      description: 'Earn 2.5 times more coins on all activities',
    },
    {
      icon: Clock,
      title: 'Instant Withdrawals',
      description: 'Get your money within minutes, not days',
    },
    {
      icon: Zap,
      title: 'Unlimited Spins',
      description: 'Spin the wheel as many times as you want',
    },
    {
      icon: Star,
      title: 'Exclusive Tasks',
      description: 'Access premium-only high-reward tasks',
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: 'Get help faster with dedicated support',
    },
    {
      icon: Sparkles,
      title: 'Premium Badge',
      description: 'Stand out with your exclusive premium badge',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-premium/20 via-background to-secondary/20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Upgrade to Premium</h1>
            <p className="text-sm text-muted-foreground">Unlock exclusive benefits</p>
          </div>
        </div>

        {/* Hero Card */}
        <Card className="p-8 bg-gradient-to-br from-premium/30 to-secondary/30 border-premium/50 premium-glow">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-premium/20 mb-4">
              <Crown className="w-12 h-12 text-premium" />
            </div>
            <h2 className="text-3xl font-bold">Cozon RQ Premium</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Supercharge your earnings and enjoy exclusive benefits with our premium membership
            </p>
            <div className="flex items-baseline justify-center gap-2 mt-6">
              <span className="text-5xl font-bold text-premium">${PREMIUM_PRICE_USD}</span>
              <span className="text-muted-foreground">one-time payment</span>
            </div>
            <p className="text-sm text-muted-foreground">Lifetime access • No recurring fees</p>
          </div>
        </Card>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-6 hover:border-premium/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-premium/10 flex items-center justify-center">
                  <benefit.icon className="w-6 h-6 text-premium" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Comparison Table */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 text-center">Free vs Premium</h3>
          <div className="space-y-3">
            {[
              { feature: 'Spin Wheel', free: '1 per day', premium: 'Unlimited' },
              { feature: 'Task Earnings', free: '1× coins', premium: '2.5× coins' },
              { feature: 'Meme Interactions', free: '1× coins', premium: '2.5× coins' },
              { feature: 'Ad Rewards', free: '1× coins', premium: '2.5× coins' },
              { feature: 'Withdrawal Speed', free: '1-3 days', premium: 'Instant' },
              { feature: 'Support Priority', free: 'Standard', premium: 'Priority' },
            ].map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-4 py-3 border-b border-border last:border-0"
              >
                <div className="font-medium">{item.feature}</div>
                <div className="text-center text-muted-foreground">{item.free}</div>
                <div className="text-center text-premium font-semibold">{item.premium}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <Card className="p-8 bg-gradient-to-r from-premium/20 to-secondary/20 border-premium/50">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">Ready to Upgrade?</h3>
            <p className="text-muted-foreground">
              Join thousands of premium members earning more every day
            </p>
            
            {/* Blurred Button Area */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-premium/30 to-secondary/30 blur-2xl rounded-2xl"></div>
              <Button
                size="lg"
                variant="premium"
                className="relative text-lg px-12 py-6 h-auto bg-gradient-to-r from-premium to-premium/80 hover:from-premium/90 hover:to-premium/70 text-white font-bold shadow-2xl border-2 border-premium/50"
                onClick={handleUpgrade}
                disabled={loading || !paystackLoaded}
              >
                {loading ? (
                  <span className="text-white">Processing...</span>
                ) : (
                  <>
                    <Crown className="w-6 h-6 mr-2" />
                    <span className="text-white">Upgrade Now - ${PREMIUM_PRICE_USD}</span>
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Secure payment powered by Paystack • One-time payment • Lifetime access
            </p>
          </div>
        </Card>

        {/* FAQ */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Is this a one-time payment?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! Pay once and enjoy premium benefits forever. No recurring fees.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Can I get a refund?</h4>
              <p className="text-sm text-muted-foreground">
                Due to the instant nature of digital benefits, all sales are final. However, we're
                confident you'll love premium!
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">How do instant withdrawals work?</h4>
              <p className="text-sm text-muted-foreground">
                Premium members' withdrawal requests are processed automatically within minutes
                instead of the standard 1-3 business days.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};