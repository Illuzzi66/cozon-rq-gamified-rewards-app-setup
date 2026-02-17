
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function AdminSettings() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!loading && profile && !profile.is_admin) {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!profile?.is_admin) return;
      
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value');

        if (error) throw error;

        if (data) {
          data.forEach((setting) => {
            if (setting.setting_key === 'ad_frequency') {
              setAdFrequency(setting.setting_value as AdFrequencySettings);
            } else if (setting.setting_key === 'ad_timing') {
              setAdTiming(setting.setting_value as AdTimingSettings);
            } else if (setting.setting_key === 'coin_conversion') {
              setCoinConversion(setting.setting_value as CoinConversionSettings);
            }
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading) {
      loadSettings();
    }
  }, [profile, loading, toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [
        {
          setting_key: 'ad_frequency',
          setting_value: adFrequency,
          updated_by: profile?.user_id,
          updated_at: new Date().toISOString(),
        },
        {
          setting_key: 'ad_timing',
          setting_value: adTiming,
          updated_by: profile?.user_id,
          updated_at: new Date().toISOString(),
        },
        {
          setting_key: 'coin_conversion',
          setting_value: coinConversion,
          updated_by: profile?.user_id,
          updated_at: new Date().toISOString(),
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, {
            onConflict: 'setting_key',
          });

        if (error) throw error;
      }

      toast({
        title: 'Settings saved',
        description: 'App settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">App Settings</h1>
              <p className="text-sm text-muted-foreground">Configure app parameters</p>
            </div>
          </div>
        </div>

        {/* Ad Frequency Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Ad Frequency Limits</CardTitle>
            <CardDescription>
              Control how often users can watch ads (Premium users bypass these limits)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_ads_per_hour">Maximum Ads Per Hour</Label>
              <Input
                id="max_ads_per_hour"
                type="number"
                min="1"
                max="100"
                value={adFrequency.max_ads_per_hour}
                onChange={(e) =>
                  setAdFrequency({ ...adFrequency, max_ads_per_hour: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of ads a user can watch per hour
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_ads_per_day">Maximum Ads Per Day</Label>
              <Input
                id="max_ads_per_day"
                type="number"
                min="1"
                max="500"
                value={adFrequency.max_ads_per_day}
                onChange={(e) =>
                  setAdFrequency({ ...adFrequency, max_ads_per_day: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of ads a user can watch per day
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_seconds_between_ads">Minimum Seconds Between Ads</Label>
              <Input
                id="min_seconds_between_ads"
                type="number"
                min="30"
                max="3600"
                value={adFrequency.min_seconds_between_ads}
                onChange={(e) =>
                  setAdFrequency({
                    ...adFrequency,
                    min_seconds_between_ads: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum wait time between consecutive ads (in seconds)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ad Timing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Ad Timing Triggers</CardTitle>
            <CardDescription>
              Configure when automatic ads are shown to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comments_before_ad">Comments Before Ad</Label>
              <Input
                id="comments_before_ad"
                type="number"
                min="1"
                max="50"
                value={adTiming.comments_before_ad}
                onChange={(e) =>
                  setAdTiming({ ...adTiming, comments_before_ad: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Show ad after user posts this many comments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutes_before_ad">Minutes Before Ad</Label>
              <Input
                id="minutes_before_ad"
                type="number"
                min="1"
                max="60"
                value={adTiming.minutes_before_ad}
                onChange={(e) =>
                  setAdTiming({ ...adTiming, minutes_before_ad: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Show ad after user has been active for this many minutes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coin Conversion Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Coin Conversion Rates</CardTitle>
            <CardDescription>
              Configure coin-to-dollar conversion and withdrawal limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coins_per_dollar">Coins Per Dollar</Label>
              <Input
                id="coins_per_dollar"
                type="number"
                min="100"
                max="10000"
                value={coinConversion.coins_per_dollar}
                onChange={(e) =>
                  setCoinConversion({ ...coinConversion, coins_per_dollar: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                How many coins equal $1 USD
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_withdrawal_coins">Minimum Withdrawal (Coins)</Label>
              <Input
                id="min_withdrawal_coins"
                type="number"
                min="1000"
                max="50000"
                value={coinConversion.min_withdrawal_coins}
                onChange={(e) =>
                  setCoinConversion({
                    ...coinConversion,
                    min_withdrawal_coins: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum coins required to withdraw (currently ${(coinConversion.min_withdrawal_coins / coinConversion.coins_per_dollar).toFixed(2)})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}