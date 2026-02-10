
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Zap, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
}

export default function TestSpinWheel() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Check user profile', status: 'pending' },
    { name: 'Check spins available', status: 'pending' },
    { name: 'Test deduct_spin RPC', status: 'pending' },
    { name: 'Test record_spin_result RPC', status: 'pending' },
    { name: 'Test record_spin_ad_view RPC', status: 'pending' },
    { name: 'Verify coin balance update', status: 'pending' },
    { name: 'Verify spins update', status: 'pending' },
  ]);
  const [running, setRunning] = useState(false);
  const [initialState, setInitialState] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      setInitialState({
        coins: profile.coin_balance,
        spins: profile.spins_available,
        userId: profile.user_id,
      });
    }
  }, [profile]);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTests = async () => {
    if (!profile) {
      toast({
        title: 'Error',
        description: 'Please log in first',
        variant: 'destructive',
      });
      return;
    }

    setRunning(true);
    
    // Test 1: Check user profile
    updateTest(0, { status: 'running' });
    try {
      if (profile.user_id) {
        updateTest(0, { 
          status: 'success', 
          message: `User ID: ${profile.user_id}`,
          details: { coins: profile.coin_balance, spins: profile.spins_available }
        });
      } else {
        throw new Error('No user ID found');
      }
    } catch (error: any) {
      updateTest(0, { status: 'error', message: error.message });
      setRunning(false);
      return;
    }

    // Test 2: Check spins available
    updateTest(1, { status: 'running' });
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('spins_available')
        .eq('user_id', profile.user_id)
        .single();

      if (error) throw error;
      
      updateTest(1, { 
        status: 'success', 
        message: `Spins: ${data.spins_available}`,
        details: data
      });
    } catch (error: any) {
      updateTest(1, { status: 'error', message: error.message });
    }

    // Test 3: Test deduct_spin RPC
    updateTest(2, { status: 'running' });
    try {
      const { data, error } = await supabase.rpc('deduct_spin', {
        p_user_id: profile.user_id,
      });

      console.log('deduct_spin response:', { data, error, type: typeof data });

      if (error) throw error;

      const result = typeof data === 'object' && data !== null ? data : { success: false };
      
      if (result.success === true || result.success === 't' || result.success === 'true') {
        updateTest(2, { 
          status: 'success', 
          message: `Spin deducted. Remaining: ${result.spins_available}`,
          details: result
        });
      } else {
        throw new Error(result.error || 'Failed to deduct spin');
      }
    } catch (error: any) {
      updateTest(2, { status: 'error', message: error.message });
    }

    // Test 4: Test record_spin_result RPC
    updateTest(3, { status: 'running' });
    try {
      const { data, error } = await supabase.rpc('record_spin_result', {
        p_user_id: profile.user_id,
        p_reward_type: 'coins',
        p_reward_amount: 100,
        p_reward_subtype: null,
        p_money_amount: 0,
      });

      console.log('record_spin_result response:', { data, error, type: typeof data });

      if (error) throw error;

      const result = typeof data === 'object' && data !== null ? data : { success: false };
      
      if (result.success === true || result.success === 't' || result.success === 'true') {
        updateTest(3, { 
          status: 'success', 
          message: `Spin result recorded. New balance: ${result.new_balance}`,
          details: result
        });
      } else {
        throw new Error('Failed to record spin result');
      }
    } catch (error: any) {
      updateTest(3, { status: 'error', message: error.message });
    }

    // Test 5: Test record_spin_ad_view RPC
    updateTest(4, { status: 'running' });
    try {
      const { data, error } = await supabase.rpc('record_spin_ad_view', {
        p_user_id: profile.user_id,
        p_ad_type: 'spin_video',
        p_view_duration: 30,
      });

      console.log('record_spin_ad_view response:', { 
        data, 
        error, 
        type: typeof data,
        isArray: Array.isArray(data)
      });

      if (error) throw error;

      // This RPC returns TABLE, so data is an array
      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        
        if (result.success === true || result.success === 't' || result.success === 'true') {
          updateTest(4, { 
            status: 'success', 
            message: `Ad view recorded. Spins awarded: ${result.spins_awarded}`,
            details: result
          });
        } else {
          updateTest(4, { 
            status: 'error', 
            message: result.error || 'Daily limit reached',
            details: result
          });
        }
      } else {
        throw new Error('No data returned from RPC');
      }
    } catch (error: any) {
      updateTest(4, { status: 'error', message: error.message });
    }

    // Test 6: Verify coin balance update
    updateTest(5, { status: 'running' });
    try {
      await refreshProfile();
      
      // Wait for profile to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('coin_balance')
        .eq('user_id', profile.user_id)
        .single();

      if (error) throw error;

      const coinDiff = data.coin_balance - (initialState?.coins || 0);
      
      updateTest(5, { 
        status: 'success', 
        message: `Balance: ${data.coin_balance} (${coinDiff >= 0 ? '+' : ''}${coinDiff})`,
        details: { old: initialState?.coins, new: data.coin_balance, diff: coinDiff }
      });
    } catch (error: any) {
      updateTest(5, { status: 'error', message: error.message });
    }

    // Test 7: Verify spins update
    updateTest(6, { status: 'running' });
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('spins_available')
        .eq('user_id', profile.user_id)
        .single();

      if (error) throw error;

      const spinDiff = data.spins_available - (initialState?.spins || 0);
      
      updateTest(6, { 
        status: 'success', 
        message: `Spins: ${data.spins_available} (${spinDiff >= 0 ? '+' : ''}${spinDiff})`,
        details: { old: initialState?.spins, new: data.spins_available, diff: spinDiff }
      });
    } catch (error: any) {
      updateTest(6, { status: 'error', message: error.message });
    }

    setRunning(false);
    
    toast({
      title: 'Tests Complete',
      description: 'Check the results below',
    });
  };

  const resetTests = () => {
    setTests(tests.map(test => ({ ...test, status: 'pending', message: undefined, details: undefined })));
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!profile) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Please Log In</CardTitle>
            <CardDescription>You need to be logged in to run tests</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Spin Wheel Test Suite
          </CardTitle>
          <CardDescription>
            Comprehensive testing for spin wheel and ad functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Initial State */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold mb-2">Initial State</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span>Coins: {initialState?.coins || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Spins: {initialState?.spins || 0}</span>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-2">
            {tests.map((test, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg transition-colors ${getStatusColor(test.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(test.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{test.name}</span>
                      <Badge variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'secondary'}>
                        {test.status}
                      </Badge>
                    </div>
                    {test.message && (
                      <p className="text-sm text-gray-600 mb-1">{test.message}</p>
                    )}
                    {test.details && (
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-700">View details</summary>
                        <pre className="mt-2 p-2 bg-white rounded border overflow-x-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={runTests}
              disabled={running}
              className="flex-1"
            >
              {running ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
            <Button
              onClick={resetTests}
              variant="outline"
              disabled={running}
            >
              Reset
            </Button>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This test will actually deduct a spin, record a spin result, and attempt to claim an ad reward. 
              Make sure you have enough spins available before running.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}