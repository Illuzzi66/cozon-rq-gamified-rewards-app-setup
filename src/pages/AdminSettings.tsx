
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Settings } from 'lucide-react';

interface AdFrequencySettings {
  max_ads_per_hour: number;
  max_ads_per_day: number;
  min_seconds_between_ads: number;
}

interface AdTimingSettings {
  comments_before_ad: number;
  minutes_before_ad: number;
}

interface CoinConversionSettings {
  coins_per_dollar: number;
  min_withdrawal_coins: number;
}

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [adFrequency, setAdFrequency] = useState<AdFrequencySettings>({
    max_ads_per_hour: 6,
    max_ads_per_day: 50,
    min_seconds_between_ads: 300,
  });

  const [adTiming, setAdTiming] = useState<AdTimingSettings>({
    comments_before_ad: 5,
    minutes_before_ad: 5,
  });

  const [coinConversion, setCoinConversion] = useState<CoinConversionSettings>({
    coins_per_dollar: 1500,
    min_withdrawal_coins: 7500,
  });

  // Redirect if not admin
  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (error) throw error;

      data?.forEach((setting) => {
        switch (setting.setting_key) {
          case 'ad_frequency':
            setAdFrequency(setting.setting_value as AdFrequencySettings);
            break;
          case 'ad_timing':
            setAdTiming(setting.setting_value as AdTimingSettings);
            break;
          case 'coin_conversion':
            setCoinConversion(setting.setting_value as CoinConversionSettings);
            break;
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Update ad frequency settings
      const { error: freqError } = await supabase
        .from('app_settings')
        .update({
          setting_value: adFrequency,
          updated_by: profile?.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'ad_frequency');

      if (freqError) throw freqError;

      // Update ad timing settings
      const { error: timingError } = await supabase
        .from('app_settings')
        .update({
          setting_value: adTiming,
          updated_by: profile?.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'ad_timing');

      if (timingError) throw timingError;

      // Update coin conversion settings
      const { error: coinError } = await supabase
        .from('app_settings')
        .update({
          setting_value: coinConversion,
          updated_by: profile?.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'coin_conversion');

      if (coinError) throw coinError;

      toast({
        title: 'Settings Saved',
        description: 'All settings have been updated successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!profile?.is_admin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">App Settings</h1>
              <p className="text-sm text-muted-foreground">Configure app parameters</p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading settings...</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Ad Frequency Settings */}
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2">Ad Frequency Limits</h2>
                <p className="text-sm text-muted-foreground">
                  Control how often users see ads to prevent overwhelming them
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="maxAdsPerHour">Max Ads Per Hour</Label>
                  <Input
                    id="maxAdsPerHour"
                    type="number"
                    min="1"
                    max="20"
                    value={adFrequency.max_ads_per_hour}
                    onChange={(e) =>
                      setAdFrequency({
                        ...adFrequency,
                        max_ads_per_hour: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAdsPerDay">Max Ads Per Day</Label>
                  <Input
                    id="maxAdsPerDay"
                    type="number"
                    min="10"
                    max="200"
                    value={adFrequency.max_ads_per_day}
                    onChange={(e) =>
                      setAdFrequency({
                        ...adFrequency,
                        max_ads_per_day: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minSecondsBetween">Min Seconds Between Ads</Label>
                  <Input
                    id="minSecondsBetween"
                    type="number"
                    min="60"
                    max="600"
                    value={adFrequency.min_seconds_between_ads}
                    onChange={(e) =>
                      setAdFrequency({
                        ...adFrequency,
                        min_seconds_between_ads: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Ad Timing Settings */}
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2">Ad Timing Triggers</h2>
                <p className="text-sm text-muted-foreground">
                  Configure when ads are shown based on user activity
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commentsBeforeAd">Comments Before Ad</Label>
                  <Input
                    id="commentsBeforeAd"
                    type="number"
                    min="1"
                    max="20"
                    value={adTiming.comments_before_ad}
                    onChange={(e) =>
                      setAdTiming({
                        ...adTiming,
                        comments_before_ad: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Show ad after this many comments
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minutesBeforeAd">Minutes Before Ad</Label>
                  <Input
                    id="minutesBeforeAd"
                    type="number"
                    min="1"
                    max="30"
                    value={adTiming.minutes_before_ad}
                    onChange={(e) =>
                      setAdTiming({
                        ...adTiming,
                        minutes_before_ad: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Show ad after this many minutes of app usage
                  </p>
                </div>
              </div>
            </Card>

            {/* Coin Conversion Settings */}
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2">Coin Conversion Rates</h2>
                <p className="text-sm text-muted-foreground">
                  Configure coin-to-dollar conversion and withdrawal limits
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="coinsPerDollar">Coins Per Dollar</Label>
                  <Input
                    id="coinsPerDollar"
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={coinConversion.coins_per_dollar}
                    onChange={(e) =>
                      setCoinConversion({
                        ...coinConversion,
                        coins_per_dollar: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {coinConversion.coins_per_dollar} coins = $1
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minWithdrawal">Minimum Withdrawal (coins)</Label>
                  <Input
                    id="minWithdrawal"
                    type="number"
                    min="1000"
                    max="50000"
                    step="500"
                    value={coinConversion.min_withdrawal_coins}
                    onChange={(e) =>
                      setCoinConversion({
                        ...coinConversion,
                        min_withdrawal_coins: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {coinConversion.min_withdrawal_coins} coins = $
                    {(coinConversion.min_withdrawal_coins / coinConversion.coins_per_dollar).toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving} size="lg">
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save All Settings'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};