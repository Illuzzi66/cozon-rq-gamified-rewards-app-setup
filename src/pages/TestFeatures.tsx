import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  Coins,
  Video,
  RefreshCw
} from 'lucide-react';
import {
  TestResult,
  testWatchAdDailyLimit,
  testWatchAdRewards,
  testSpinWheelProbabilities,
  testSpinWheelRewardTypes,
  testSpinPurchaseDiscounts,
  generateTestReport,
  logTestResults
} from '@/utils/testHelpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export const TestFeatures: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [watchAdStats, setWatchAdStats] = useState<any>(null);
  const [spinHistory, setSpinHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('watch-ads');

  useEffect(() => {
    if (profile) {
      loadWatchAdStats();
      loadSpinHistory();
    }
  }, [profile]);

  const loadWatchAdStats = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc('get_daily_ad_stats', {
        p_user_id: profile.user_id,
      });

      if (error) throw error;
      const statsData = Array.isArray(data) ? data[0] : data;
      setWatchAdStats(statsData);
    } catch (error) {
      console.error('Failed to load watch ad stats:', error);
    }
  };

  const loadSpinHistory = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc('get_spin_history', {
        p_user_id: profile.user_id,
        p_limit: 100,
      });

      if (error) throw error;
      setSpinHistory(data || []);
    } catch (error) {
      console.error('Failed to load spin history:', error);
    }
  };

  const runWatchAdTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    try {
      // Test 1: Daily Limit Enforcement
      if (watchAdStats) {
        const limitTest = await testWatchAdDailyLimit(
          watchAdStats.daily_count,
          watchAdStats.daily_limit
        );
        results.push(limitTest);
      }

      // Test 2: Reward Calculation (Free User)
      const freeUserTest = testWatchAdRewards(false, 5);
      results.push(freeUserTest);

      // Test 3: Reward Calculation (Premium User)
      const premiumUserTest = testWatchAdRewards(true, 5);
      results.push(premiumUserTest);

      // Test 4: Current User Reward
      if (profile) {
        const currentUserTest = testWatchAdRewards(profile.is_premium, 5);
        results.push({
          ...currentUserTest,
          testName: 'Current User Reward Calculation'
        });
      }

      setTestResults(results);
      logTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runSpinWheelTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    try {
      // Test 1: Reward Types Configuration
      const rewardTypesTest = testSpinWheelRewardTypes();
      results.push(rewardTypesTest);

      // Test 2: Probability Distribution
      if (spinHistory.length > 0) {
        const spinResults = spinHistory.map(spin => ({
          rewardType: spin.reward_type,
          rewardAmount: spin.reward_amount,
          probability: 0 // Will be calculated from actual distribution
        }));
        const probabilityTest = testSpinWheelProbabilities(spinResults);
        results.push(probabilityTest);
      } else {
        results.push({
          testName: 'Spin Wheel Probability Distribution',
          passed: false,
          message: 'No spin history available. Spin the wheel at least 10 times for meaningful analysis.',
          timestamp: new Date()
        });
      }

      // Test 3: Spin Purchase Discounts
      const discount1Test = testSpinPurchaseDiscounts(1, 50);
      results.push({ ...discount1Test, testName: 'Spin Purchase - 1 spin (no discount)' });

      const discount10Test = testSpinPurchaseDiscounts(10, 50);
      results.push({ ...discount10Test, testName: 'Spin Purchase - 10 spins (10% discount)' });

      const discount20Test = testSpinPurchaseDiscounts(20, 50);
      results.push({ ...discount20Test, testName: 'Spin Purchase - 20 spins (20% discount)' });

      setTestResults(results);
      logTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    const report = generateTestReport(testResults);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    );
  };

  if (!profile) return null;

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Feature Testing</h1>
              <p className="text-sm text-muted-foreground">
                Test Watch to Earn and Spin Wheel features
              </p>
            </div>
          </div>
        </div>

        {/* Test Summary */}
        {testResults.length > 0 && (
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-foreground">{totalTests}</p>
                <p className="text-xs text-muted-foreground">Total Tests</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-success">{passedTests}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-destructive">{totalTests - passedTests}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </Card>
        )}

        {/* Test Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="watch-ads">
              <Video className="w-4 h-4 mr-2" />
              Watch to Earn
            </TabsTrigger>
            <TabsTrigger value="spin-wheel">
              <BarChart3 className="w-4 h-4 mr-2" />
              Spin Wheel
            </TabsTrigger>
          </TabsList>

          {/* Watch to Earn Tests */}
          <TabsContent value="watch-ads" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Watch to Earn Tests</h3>
                    <p className="text-sm text-muted-foreground">
                      Verify daily limits, rewards, and duplicate prevention
                    </p>
                  </div>
                  <Button
                    onClick={runWatchAdTests}
                    disabled={isRunning}
                    size="lg"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Tests
                      </>
                    )}
                  </Button>
                </div>

                {/* Current Stats */}
                {watchAdStats && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Current Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ads Watched Today</p>
                        <p className="font-bold">{watchAdStats.daily_count} / {watchAdStats.daily_limit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Coins Earned Today</p>
                        <p className="font-bold text-gold">{watchAdStats.daily_earnings}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining Ads</p>
                        <p className="font-bold text-primary">{watchAdStats.remaining}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">User Type</p>
                        <Badge variant={profile.is_premium ? 'premium' : 'default'}>
                          {profile.is_premium ? 'Premium (2.5x)' : 'Free'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Checklist */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Test Coverage</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Daily limit enforcement (5 ads max)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Free user rewards (5 coins per ad)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Premium user rewards (12 coins per ad)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Current user reward calculation</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Spin Wheel Tests */}
          <TabsContent value="spin-wheel" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Spin Wheel Tests</h3>
                    <p className="text-sm text-muted-foreground">
                      Verify reward distribution and probability calculations
                    </p>
                  </div>
                  <Button
                    onClick={runSpinWheelTests}
                    disabled={isRunning}
                    size="lg"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Tests
                      </>
                    )}
                  </Button>
                </div>

                {/* Spin History Stats */}
                {spinHistory.length > 0 && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Spin History Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Spins</p>
                        <p className="font-bold">{spinHistory.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Coin Wins</p>
                        <p className="font-bold text-gold">
                          {spinHistory.filter(s => s.reward_type === 'coins').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Money Wins</p>
                        <p className="font-bold text-success">
                          {spinHistory.filter(s => s.reward_type === 'money').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Losses</p>
                        <p className="font-bold text-destructive">
                          {spinHistory.filter(s => s.reward_type === 'loss').length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Checklist */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Test Coverage</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Reward types configuration (10 segments)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Probability distribution analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Money reward mapping ($0.50 = 750, $2 = 3000)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Bulk purchase discounts (10%, 20%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Test Results</h3>
              <Button onClick={downloadReport} variant="outline" size="sm">
                Download Report
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.passed
                        ? 'bg-success/5 border-success/30'
                        : 'bg-destructive/5 border-destructive/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.passed)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold">{result.testName}</h4>
                          <Badge variant={result.passed ? 'default' : 'destructive'}>
                            {result.passed ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {result.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Testing Instructions
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Watch to Earn:</strong> Tests verify the 5-ad daily limit, reward calculations
              for free (5 coins) and premium users (12 coins), and duplicate prevention.
            </p>
            <p>
              <strong>Spin Wheel:</strong> Tests verify reward type configuration, probability
              distribution, money reward mapping, and bulk purchase discounts.
            </p>
            <p>
              <strong>Note:</strong> For accurate probability analysis, spin the wheel at least
              10-20 times. The more spins, the more accurate the distribution analysis.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TestFeatures;
