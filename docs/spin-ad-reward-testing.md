# Spin Ad Reward Testing Guide

## Issue Fixed
The `record_spin_ad_view` database function was updating the wrong table (`user_profiles` instead of `profiles`), preventing spins from being awarded after watching ads.

## Fix Applied
Updated the database function to use the correct table name:
```sql
UPDATE profiles
SET spins_available = spins_available + v_spins_to_award
WHERE user_id = p_user_id;
```

## Testing Steps

### 1. Check Initial Spin Count
1. Navigate to Spin Wheel page
2. Note your current spin count (displayed at top)
3. Check "Watch Ads for Spins" section
4. Verify it shows "X/3 ads watched today"

### 2. Watch Ad for Spins
1. Click "Watch Ad for Spins" button
2. Wait for 30-second ad simulation to complete
3. Progress bar should reach 100%
4. "Claim Reward" button should become enabled
5. Click "Claim Reward" button

### 3. Verify Spin Award
**Expected Results:**
- ✅ Toast notification: "🎉 Spins Earned! You earned 3 spins!"
- ✅ Spin count increases by 3 immediately
- ✅ Ad counter updates (e.g., "1/3 ads watched today")
- ✅ Success sound plays
- ✅ Ad UI resets for next watch

**Check Database:**
```sql
-- Check user's current spins
SELECT user_id, spins_available 
FROM profiles 
WHERE user_id = 'YOUR_USER_ID';

-- Check ad view records
SELECT user_id, ad_type, created_at 
FROM ad_views 
WHERE user_id = 'YOUR_USER_ID' 
  AND ad_type = 'spin_video'
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

### 4. Test Daily Limit
1. Watch and claim 3 ads total
2. After 3rd ad, button should show "Daily Limit Reached"
3. Attempting to watch more should show error message
4. Verify database enforces limit

### 5. Test Spin Usage
1. Use one of your earned spins
2. Click "Spin the Wheel"
3. Verify spin count decreases by 1
4. Verify reward is awarded correctly

### 6. Test Next Day Reset
1. Wait 24 hours or manually update database:
```sql
-- Simulate next day (for testing only)
DELETE FROM ad_views 
WHERE user_id = 'YOUR_USER_ID' 
  AND ad_type = 'spin_video';
```
2. Refresh page
3. Verify ad counter resets to "0/3 ads watched today"
4. Verify you can watch ads again

## Console Logging
The SpinWheel component includes detailed logging:
- `🎁 === STARTING AD CLAIM ===` - Claim process started
- `📞 Calling record_spin_ad_view...` - Database function called
- `📥 RPC Response:` - Database response received
- `✅ Claim Result:` - Success details
- `🔄 Refreshing profile and spin data...` - Data refresh started
- `✅ Spins after refresh:` - New spin count

## Common Issues

### Spins Not Awarded
**Symptoms:** Toast shows success but spin count doesn't increase
**Cause:** Database function using wrong table name
**Fix:** Already applied - function now updates `profiles` table

### Claim Button Not Working
**Symptoms:** Button doesn't respond to clicks
**Cause:** `adCompleted` state not set to true
**Check:** Verify ad progress reaches 100% and `setAdCompleted(true)` is called

### Daily Limit Not Enforcing
**Symptoms:** Can watch more than 3 ads per day
**Cause:** Database constraint not working
**Check:** Verify `ad_views` table has records and date comparison is correct

### Duplicate Claims
**Symptoms:** Can claim same ad multiple times
**Cause:** `claimingReward` state not preventing re-entry
**Check:** Verify loading state is set before async operation

## Success Criteria
✅ Spins increase by 3 after each ad claim
✅ Ad counter updates correctly (0/3 → 1/3 → 2/3 → 3/3)
✅ Daily limit enforced (max 3 ads per day)
✅ Cannot claim same ad twice
✅ Spin count persists after page refresh
✅ Database records match UI display
✅ Toast notifications show correct information
✅ Sound effects play on success

## Database Verification Query
```sql
-- Complete verification query
SELECT 
  p.user_id,
  p.username,
  p.spins_available,
  COUNT(av.id) as ads_watched_today,
  3 - COUNT(av.id) as ads_remaining
FROM profiles p
LEFT JOIN ad_views av ON av.user_id = p.user_id 
  AND av.ad_type = 'spin_video'
  AND av.created_at >= CURRENT_DATE
WHERE p.user_id = 'YOUR_USER_ID'
GROUP BY p.user_id, p.username, p.spins_available;
```
