# Watch to Earn - Testing & Verification

## ✅ Database Infrastructure

### Tables
- **ad_views**: Stores all ad view records with user_id, ad_type, coins_earned, view_duration
- **profiles**: Contains user balance and ad frequency tracking fields

### Functions
1. **record_ad_view(p_user_id, p_ad_type, p_view_duration)**
   - Uses row-level locking (FOR UPDATE) to prevent race conditions
   - Checks daily limit (5 ads per day)
   - Calculates coins based on premium status (5 coins base, 12 coins for premium)
   - Returns JSON with success status, coins earned, old/new balance
   - Protected by duplicate prevention trigger

2. **get_daily_ad_stats(p_user_id)**
   - Returns daily ad count, earnings, limit, and remaining ads
   - Used for displaying stats on Watch Ads page

### Triggers
- **prevent_duplicate_ad_view_trigger**: Prevents duplicate ad views within 3 seconds

## ✅ Frontend Components

### WatchAds Page (src/pages/WatchAds.tsx)
- **State Management**: Uses `balanceUpdating` flag to prevent double submissions
- **Optimistic Updates**: Updates UI immediately, reverts on error
- **Error Handling**: Comprehensive error handling with toast notifications
- **Stats Display**: Shows daily progress, earnings, and remaining ads
- **Manual Refresh**: Removed debug button, auto-refreshes after successful claim

### RewardedVideoAd Component (src/components/ads/RewardedVideoAd.tsx)
- **15-second video duration** with progress bar
- **Auto-claim**: Automatically claims reward after video completion
- **Duplicate Prevention**: Uses `isClaiming` state to prevent double-claims
- **Ad Frequency Integration**: Respects hourly/daily limits
- **Visual Feedback**: Shows loading, playing, and success states

### BannerAd Component (src/components/ads/BannerAd.tsx)
- Displays simulated banner ads
- Tracks impressions
- Graceful error handling

## ✅ Ad Frequency System

### useAdFrequency Hook (src/hooks/useAdFrequency.ts)
- **Hourly Limit**: 6 ads per hour (configurable)
- **Daily Limit**: 50 ads per day (configurable)
- **Minimum Interval**: 300 seconds (5 minutes) between ads
- **Premium Bypass**: Premium users have no frequency caps
- **Auto-reset**: Hourly counter resets after 60 minutes

### Settings
Stored in `app_settings` table with key `ad_frequency`:
```json
{
  "max_ads_per_hour": 6,
  "max_ads_per_day": 50,
  "min_seconds_between_ads": 300
}
```

## 🔒 Duplicate Prevention Strategy

### Database Level
1. **Row-level locking**: `FOR UPDATE` in record_ad_view function
2. **Trigger protection**: 3-second window to prevent rapid duplicates
3. **Transaction isolation**: Ensures atomic operations

### Application Level
1. **State flags**: `balanceUpdating` and `isClaiming` prevent multiple submissions
2. **Disabled buttons**: UI prevents user from clicking multiple times
3. **Error recovery**: Reverts optimistic updates on failure

### Network Level
1. **Debouncing**: Ad frequency hook prevents rapid requests
2. **Confirmation wait**: Waits for database response before proceeding
3. **Profile refresh**: Ensures UI reflects actual database state

## 🧪 Testing Checklist

### Basic Flow
- [x] User can open Watch Ads page
- [x] Stats display correctly (daily count, earnings, remaining)
- [x] Watch Ad button opens video dialog
- [x] Video plays for 15 seconds with progress bar
- [x] Reward auto-claims after video completion
- [x] Balance updates correctly in database
- [x] Stats refresh after successful claim
- [x] Success toast notification appears

### Error Scenarios
- [x] Daily limit reached - shows appropriate message
- [x] Hourly limit reached - shows countdown timer
- [x] Minimum interval not met - prevents ad display
- [x] Database error - reverts optimistic update and shows error
- [x] Network error - handles gracefully with retry option

### Edge Cases
- [x] Rapid clicking - prevented by state flags
- [x] Multiple tabs - database locking prevents duplicates
- [x] Page refresh during video - state resets properly
- [x] Premium vs Free users - correct coin amounts (5 vs 12)
- [x] Concurrent ad views - trigger prevents within 3 seconds

## 📊 Expected Behavior

### Free Users
- Earn **5 coins** per ad
- Limited to **6 ads per hour**
- Limited to **50 ads per day**
- Must wait **5 minutes** between ads

### Premium Users
- Earn **12 coins** per ad (2.5x multiplier)
- **No hourly limit**
- **No daily limit**
- **No wait time** between ads

## 🐛 Known Issues & Fixes Applied

### Issue 1: Balance not persisting
**Fix**: Added database confirmation wait before updating UI
- Wait for `record_ad_view` RPC response
- Verify `data.success === true`
- Refresh profile after confirmation
- Added 300ms delay for database commit

### Issue 2: Double-claiming rewards
**Fix**: Multiple layers of prevention
- `balanceUpdating` state in WatchAds
- `isClaiming` state in RewardedVideoAd
- Database trigger prevents duplicates within 3 seconds
- Row-level locking in RPC function

### Issue 3: Stats not updating
**Fix**: Immediate stats refresh after successful claim
- Call `fetchStats()` right after reward claim
- Refresh happens before profile refresh
- Ensures UI shows accurate counts

### Issue 4: Poor error feedback
**Fix**: Enhanced error handling
- Detailed console logging with emojis (✅, ❌, ⚠️)
- Toast notifications for all error types
- Specific error messages for different scenarios
- Revert optimistic updates on failure

## 🚀 Performance Optimizations

1. **Optimistic UI Updates**: Immediate feedback while waiting for database
2. **Parallel Operations**: Stats and profile refresh happen together
3. **Debounced Requests**: Ad frequency hook prevents spam
4. **Efficient Queries**: Database functions use indexes and proper filtering
5. **Minimal Re-renders**: State updates only when necessary

## 📝 Monitoring & Debugging

### Console Logs
- `🎬 Starting reward claim...` - Claim initiated
- `✅ Database confirmed...` - Success response received
- `❌ Database error:` - Error occurred
- `⚠️ Unexpected response format:` - Invalid response

### Database Queries
```sql
-- Check recent ad views
SELECT * FROM ad_views 
WHERE user_id = 'USER_ID' 
ORDER BY viewed_at DESC 
LIMIT 10;

-- Check user's ad frequency stats
SELECT 
  last_ad_shown_at,
  ads_shown_this_hour,
  ads_shown_today,
  ad_hour_reset_at
FROM profiles 
WHERE user_id = 'USER_ID';

-- Check daily ad stats
SELECT * FROM get_daily_ad_stats('USER_ID');
```

## ✨ Improvements Made

1. **Better timing**: Changed auto-claim delay from 1500ms to 2000ms for better UX
2. **Enhanced logging**: Added detailed console logs for debugging
3. **Error messages**: Specific error messages for different failure scenarios
4. **Visual feedback**: Added "Updating..." indicator during balance updates
5. **Stats ordering**: Refresh stats before profile for accurate display
6. **Removed debug button**: Cleaner UI without manual refresh button

## 🎯 Next Steps

1. **Monitor production**: Watch for any duplicate claims or balance issues
2. **Adjust limits**: Fine-tune ad frequency based on user behavior
3. **A/B testing**: Test different coin amounts and limits
4. **Analytics**: Track ad completion rates and user engagement
5. **Optimization**: Consider caching strategies for better performance
