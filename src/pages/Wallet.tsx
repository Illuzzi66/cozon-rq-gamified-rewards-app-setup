
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Wallet as WalletIcon, 
  Coins,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertCircle,
  Banknote,
  Crown
} from 'lucide-react';
import { formatCoins } from '@/lib/utils';

interface WithdrawalStats {
  total_withdrawn: number;
  pending_amount: number;
  total_count: number;
  pending_count: number;
}

interface Withdrawal {
  id: string;
  amount_coins: number;
  amount_usd: number;
  status: 'pending' | 'approved' | 'rejected';
  bank_name: string;
  account_number: string;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
}

export const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [amountCoins, setAmountCoins] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const COIN_TO_USD = 0.001; // 1000 coins = $1
  const MIN_WITHDRAWAL_COINS = 5000; // $5 minimum
  const MIN_WITHDRAWAL_USD = 5;

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Fetch stats and history in parallel
      const [statsResult, historyResult] = await Promise.all([
        supabase.rpc('get_withdrawal_stats', { p_user_id: profile.user_id }),
        supabase.rpc('get_withdrawal_history', { p_user_id: profile.user_id })
      ]);

      if (statsResult.error) throw statsResult.error;
      if (historyResult.error) throw historyResult.error;

      setStats(statsResult.data);
      setHistory(historyResult.data || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wallet data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || submitting) return;

    const coins = parseInt(amountCoins);
    if (isNaN(coins) || coins < MIN_WITHDRAWAL_COINS) {
      toast({
        title: 'Invalid Amount',
        description: `Minimum withdrawal is ${formatCoins(MIN_WITHDRAWAL_COINS)} ($${MIN_WITHDRAWAL_USD})`,
        variant: 'destructive',
      });
      return;
    }

    if (!bankName || !accountNumber || !accountName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all bank details',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase.rpc('request_withdrawal', {
        p_user_id: profile.user_id,
        p_amount_coins: coins,
        p_bank_name: bankName,
        p_account_number: accountNumber,
        p_account_name: accountName,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '✅ Withdrawal Requested',
          description: `Your withdrawal of $${data.amount_usd.toFixed(2)} is being processed`,
        });

        // Reset form
        setAmountCoins('');
        setBankName('');
        setAccountNumber('');
        setAccountName('');

        // Refresh data
        await refreshProfile();
        await fetchData();
      } else {
        toast({
          title: 'Request Failed',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to process withdrawal request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) return null;

  const amountUSD = parseInt(amountCoins || '0') * COIN_TO_USD;
  const canWithdraw = profile.coin_balance >= MIN_WITHDRAWAL_COINS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-primary/10">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Wallet</h1>
              <p className="text-sm text-muted-foreground">Withdraw your earnings</p>
            </div>
          </div>
          {profile.is_premium && (
            <div className="flex items-center gap-2 bg-premium/10 text-premium px-3 py-2 rounded-full premium-glow">
              <Crown className="w-5 h-5" />
              <span className="text-sm font-semibold">Premium</span>
            </div>
          )}
        </div>

        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-r from-gold/20 to-success/20 border-gold/30">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
              <div className="flex items-center gap-3">
                <Coins className="w-8 h-8 text-gold" />
                <div>
                  <p className="text-3xl font-bold text-gold">{formatCoins(profile.coin_balance)}</p>
                  <p className="text-sm text-muted-foreground">
                    ≈ ${(profile.coin_balance * COIN_TO_USD).toFixed(2)} USD
                  </p>
                </div>
              </div>
            </div>
            {profile.locked_coins > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Locked (Pending)</p>
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-warning" />
                  <div>
                    <p className="text-3xl font-bold text-warning">{formatCoins(profile.locked_coins)}</p>
                    <p className="text-sm text-muted-foreground">
                      ≈ ${(profile.locked_coins * COIN_TO_USD).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Stats */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">${stats.total_withdrawn.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Withdrawn</p>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="w-6 h-6 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-warning">${stats.pending_amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </Card>
            <Card className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.total_count}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </Card>
            <Card className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.total_count - stats.pending_count}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </Card>
          </div>
        )}

        {/* Withdrawal Form */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-success" />
            Request Withdrawal
          </h2>

          {!canWithdraw && (
            <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-warning">Insufficient Balance</p>
                <p className="text-muted-foreground">
                  You need at least {formatCoins(MIN_WITHDRAWAL_COINS)} (${MIN_WITHDRAWAL_USD}) to withdraw.
                  Keep earning to reach the minimum!
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (Coins)</Label>
              <Input
                id="amount"
                type="number"
                placeholder={`Minimum ${MIN_WITHDRAWAL_COINS} coins`}
                value={amountCoins}
                onChange={(e) => setAmountCoins(e.target.value)}
                min={MIN_WITHDRAWAL_COINS}
                max={profile.coin_balance}
                disabled={!canWithdraw}
              />
              {amountCoins && (
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ ${amountUSD.toFixed(2)} USD
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                type="text"
                placeholder="e.g., GTBank, Access Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={!canWithdraw}
              />
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="10-digit account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                maxLength={10}
                disabled={!canWithdraw}
              />
            </div>

            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                type="text"
                placeholder="Full name as on bank account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={!canWithdraw}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!canWithdraw || submitting}
            >
              {submitting ? 'Processing...' : 'Request Withdrawal'}
            </Button>
          </form>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <p className="font-semibold">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Minimum withdrawal: {formatCoins(MIN_WITHDRAWAL_COINS)} (${MIN_WITHDRAWAL_USD})</li>
              <li>Processing time: 1-3 business days</li>
              <li>Premium members get instant withdrawals</li>
              <li>Ensure bank details are correct to avoid delays</li>
            </ul>
          </div>
        </Card>

        {/* Withdrawal History */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Withdrawal History</h2>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No withdrawal history yet</p>
              <p className="text-sm">Your withdrawals will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {withdrawal.status === 'pending' && (
                          <Clock className="w-5 h-5 text-warning" />
                        )}
                        {withdrawal.status === 'approved' && (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                        {withdrawal.status === 'rejected' && (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-semibold capitalize">{withdrawal.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {withdrawal.bank_name} • {withdrawal.account_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(withdrawal.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {withdrawal.rejection_reason && (
                        <p className="text-sm text-destructive mt-2">
                          Reason: {withdrawal.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${withdrawal.amount_usd.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCoins(withdrawal.amount_coins)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Premium Upsell */}
        {!profile.is_premium && (
          <Card className="p-6 bg-gradient-to-r from-premium/20 to-secondary/20 border-premium/30">
            <div className="text-center space-y-3">
              <Crown className="w-12 h-12 text-premium mx-auto" />
              <h3 className="text-xl font-bold">Get Instant Withdrawals!</h3>
              <p className="text-muted-foreground">
                Premium members enjoy instant withdrawal processing and 2.5× earnings on all activities
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