// Test helper for verifying spin ad rewards
import { supabase } from '@/lib/supabase';

export interface SpinAdTestResult {
  success: boolean;
  message: string;
  details?: {
    initialSpins: number;
    finalSpins: number;
    spinsAwarded: number;
    adsWatchedToday: number;
    testTimestamp: string;
  };
  error?: string;
}

/**
 * Test the spin ad reward system
 * This simulates watching an ad and claiming the reward
 */
export async function testSpinAdReward(userId: string): Promise<SpinAdTestResult> {
  try {
    console.log('🧪 === STARTING SPIN AD REWARD TEST ===');
    console.log('User ID:', userId);
    console.log('Test started at:', new Date().toISOString());

    // Step 1: Get initial spin count
    const { data: initialProfile, error: initialError } = await supabase
      .from('profiles')
      .select('spins_available')
      .eq('user_id', userId)
      .single();

    if (initialError) {
      return {
        success: false,
        message: 'Failed to fetch initial profile',
        error: initialError.message,
      };
    }

    const initialSpins = initialProfile?.spins_available || 0;
    console.log('📊 Initial spins:', initialSpins);

    // Step 2: Check current ad count
    const { data: adCountData, error: adCountError } = await supabase.rpc(
      'get_daily_spin_ad_count',
      { p_user_id: userId }
    );

    if (adCountError) {
      return {
        success: false,
        message: 'Failed to check ad count',
        error: adCountError.message,
      };
    }

    const adsWatchedBefore = adCountData?.[0]?.ads_watched_today || 0;
    console.log('📺 Ads watched before:', adsWatchedBefore);

    if (adsWatchedBefore >= 3) {
      return {
        success: false,
        message: 'Daily ad limit already reached (3/3)',
        details: {
          initialSpins,
          finalSpins: initialSpins,
          spinsAwarded: 0,
          adsWatchedToday: adsWatchedBefore,
          testTimestamp: new Date().toISOString(),
        },
      };
    }

    // Step 3: Simulate ad view and claim reward
    console.log('🎬 Simulating ad view...');
    const { data: rewardData, error: rewardError } = await supabase.rpc(
      'record_spin_ad_view',
      {
        p_user_id: userId,
        p_ad_type: 'spin_video',
        p_view_duration: 30,
      }
    );

    if (rewardError) {
      return {
        success: false,
        message: 'Failed to record ad view',
        error: rewardError.message,
      };
    }

    console.log('📥 Reward response:', rewardData);

    if (!rewardData || !Array.isArray(rewardData) || rewardData.length === 0) {
      return {
        success: false,
        message: 'No reward data returned',
        error: 'Empty response from database',
      };
    }

    const result = rewardData[0];
    console.log('🎁 Reward result:', result);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Reward claim failed',
        error: result.error,
      };
    }

    // Step 4: Verify spin count increased
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for DB update

    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('spins_available')
      .eq('user_id', userId)
      .single();

    if (finalError) {
      return {
        success: false,
        message: 'Failed to fetch final profile',
        error: finalError.message,
      };
    }

    const finalSpins = finalProfile?.spins_available || 0;
    const spinsAwarded = result.spins_awarded || 3;
    const expectedSpins = initialSpins + spinsAwarded;

    console.log('📊 Final spins:', finalSpins);
    console.log('📊 Expected spins:', expectedSpins);
    console.log('📊 Actual increase:', finalSpins - initialSpins);

    // Step 5: Verify ad count increased
    const { data: finalAdCountData } = await supabase.rpc(
      'get_daily_spin_ad_count',
      { p_user_id: userId }
    );

    const adsWatchedAfter = finalAdCountData?.[0]?.ads_watched_today || 0;
    console.log('📺 Ads watched after:', adsWatchedAfter);

    // Verify results
    const spinsMatch = finalSpins === expectedSpins;
    const adCountIncreased = adsWatchedAfter === adsWatchedBefore + 1;

    if (spinsMatch && adCountIncreased) {
      console.log('✅ TEST PASSED - Spins awarded correctly!');
      return {
        success: true,
        message: `✅ Test passed! Spins increased from ${initialSpins} to ${finalSpins}`,
        details: {
          initialSpins,
          finalSpins,
          spinsAwarded,
          adsWatchedToday: adsWatchedAfter,
          testTimestamp: new Date().toISOString(),
        },
      };
    } else {
      console.log('❌ TEST FAILED - Verification mismatch');
      return {
        success: false,
        message: `❌ Test failed! Expected ${expectedSpins} spins, got ${finalSpins}`,
        details: {
          initialSpins,
          finalSpins,
          spinsAwarded,
          adsWatchedToday: adsWatchedAfter,
          testTimestamp: new Date().toISOString(),
        },
        error: `Spins match: ${spinsMatch}, Ad count increased: ${adCountIncreased}`,
      };
    }
  } catch (error) {
    console.error('❌ Test error:', error);
    return {
      success: false,
      message: 'Test failed with exception',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Reset daily ad count for testing (admin only)
 */
export async function resetDailyAdCount(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ad_views')
      .delete()
      .eq('user_id', userId)
      .eq('ad_type', 'spin_video')
      .gte('created_at', new Date().toISOString().split('T')[0]);

    if (error) {
      console.error('Failed to reset ad count:', error);
      return false;
    }

    console.log('✅ Daily ad count reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting ad count:', error);
    return false;
  }
}

/**
 * Get detailed spin ad statistics
 */
export async function getSpinAdStats(userId: string) {
  try {
    const [profileResult, adCountResult, adHistoryResult] = await Promise.all([
      supabase.from('profiles').select('spins_available').eq('user_id', userId).single(),
      supabase.rpc('get_daily_spin_ad_count', { p_user_id: userId }),
      supabase
        .from('ad_views')
        .select('*')
        .eq('user_id', userId)
        .eq('ad_type', 'spin_video')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false }),
    ]);

    return {
      spinsAvailable: profileResult.data?.spins_available || 0,
      adsWatchedToday: adCountResult.data?.[0]?.ads_watched_today || 0,
      adsRemaining: adCountResult.data?.[0]?.remaining_ads || 3,
      adHistory: adHistoryResult.data || [],
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}
