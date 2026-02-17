# Watch to Earn Daily Limit Testing Guide

## Overview
This guide provides step-by-step instructions to test the 5-ad daily limit for the Watch to Earn feature.

## Test Scenarios

### Scenario 1: Normal User Flow (5 Ads)
**Objective**: Verify that a user can watch exactly 5 ads per day and earn coins correctly.

**Steps**:
1. Sign in as a regular (non-premium) user
2. Navigate to Watch Ads page
3. Verify initial stats show "0/5 ads watched today"
4. Watch first ad (30 seconds)
5. Claim reward - should earn 5 coins
6. Verify stats update to "1/5 ads watched today"
7. Repeat steps 4-6 for ads 2, 3, 4, and 5
8. After 5th ad, verify:
   - Stats show "5/5 ads watched today"
   - "Watch Ad" button is disabled
   - Message displays "Daily limit reached"
   - Total earnings: 25 coins (5 coins × 5 ads)

**Expected Results**:
- ✅ User can watch exactly 5 ads
- ✅ Each ad awards 5 coins
- ✅ After 5 ads, no more ads can be watched
- ✅ Stats accurately reflect progress (0/5 → 5/5)
- ✅ Total daily earnings: 25 coins

### Scenario 2: Premium User Flow (5 Ads with Bonus)
**Objective**: Verify that premium users earn 2.5× coins (12 coins per ad).

**Steps**:
1. Sign in as a premium user
2. Navigate to Watch Ads page
3. Watch all 5 ads
4. Verify each ad awards 12 coins (2.5× multiplier)
5. Verify total earnings: 60 coins (12 coins × 5 ads)

**Expected Results**:
- ✅ Premium user earns 12 coins per ad
- ✅ Daily limit still applies (5 ads max)
- ✅ Total daily earnings: 60 coins

### Scenario 3: Daily Limit Reset
**Objective**: Verify that the daily limit resets at midnight.

**Steps**:
1. Watch 5 ads on Day 1
2. Verify limit reached message
3. Wait until next day (or manually advance database date for testing)
4. Refresh Watch Ads page
5. Verify stats reset to "0/5 ads watched today"
6. Verify "Watch Ad" button is enabled again

**Expected Results**:
- ✅ Stats reset to 0/5 at midnight
- ✅ User can watch 5 more ads the next day
- ✅ Previous day's earnings are preserved

### Scenario 4: Database Function Validation
**Objective**: Verify database functions enforce the 5-ad limit correctly.

**SQL Test Queries**:
```sql
-- Check current daily stats for a user
SELECT * FROM get_daily_ad_stats('USER_UUID_HERE');

-- Expected output columns:
-- daily_count: number of ads watched today (0-5)
-- daily_earnings: total coins earned today
-- daily_limit: 5
-- remaining: ads remaining (5 - daily_count)

-- Attempt to record 6th ad view (should fail)
SELECT record_ad_view('USER_UUID_HERE', 'video', 30);

-- Expected result after 5 ads:
-- {"success": false, "error": "Daily ad limit reached. Come back tomorrow!"}
```

**Expected Results**:
- ✅ `get_daily_ad_stats` returns correct limit (5)
- ✅ `record_ad_view` rejects 6th ad attempt
- ✅ Error message is user-friendly

### Scenario 5: Concurrent Ad Watching Prevention
**Objective**: Verify that users cannot bypass the limit by watching multiple ads simultaneously.

**Steps**:
1. Open Watch Ads page in two browser tabs
2. Start watching an ad in both tabs simultaneously
3. Try to claim rewards in both tabs
4. Verify only one claim succeeds
5. Verify ad count increments by 1, not 2

**Expected Results**:
- ✅ Row-level locking prevents duplicate claims
- ✅ Only one tab successfully claims reward
- ✅ Ad count increments correctly (no double-counting)

### Scenario 6: Edge Cases

#### 6a: Rapid Clicking
**Steps**:
1. Watch an ad
2. Rapidly click "Claim Reward" button multiple times
3. Verify only one reward is claimed
4. Verify coin balance increases by correct amount once

**Expected Results**:
- ✅ Duplicate prevention trigger blocks rapid claims
- ✅ User receives coins only once per ad

#### 6b: Page Refresh During Ad
**Steps**:
1. Start watching an ad
2. Refresh page mid-ad
3. Verify ad progress is not counted
4. Verify user can restart the ad

**Expected Results**:
- ✅ Incomplete ad views don't count toward limit
- ✅ User can retry without penalty

#### 6c: Network Interruption
**Steps**:
1. Watch an ad completely
2. Disconnect network before claiming
3. Click "Claim Reward"
4. Reconnect network
5. Verify error handling and retry mechanism

**Expected Results**:
- ✅ User receives clear error message
- ✅ Can retry claim after reconnection
- ✅ No duplicate rewards on retry

## Testing Checklist

### Frontend Validation
- [ ] Stats display shows "X/5 ads watched today"
- [ ] Progress bar updates correctly (0% → 100%)
- [ ] "Watch Ad" button disables at 5/5
- [ ] Daily limit message appears at 5/5
- [ ] Coin balance updates after each claim
- [ ] Loading states prevent double-clicking
- [ ] Error messages display for failures

### Backend Validation
- [ ] `get_daily_ad_stats` returns limit of 5
- [ ] `record_ad_view` enforces 5-ad limit
- [ ] Database triggers prevent duplicates
- [ ] Row-level locking prevents race conditions
- [ ] Premium multiplier (2.5×) works correctly
- [ ] Daily reset occurs at midnight

### User Experience
- [ ] Clear feedback when limit reached
- [ ] Countdown or indication of when limit resets
- [ ] Smooth animations and transitions
- [ ] No confusing error messages
- [ ] Responsive on mobile devices

## Common Issues and Solutions

### Issue 1: Stats Not Updating
**Symptom**: Ad count stays at 0/5 after watching ads
**Solution**: Check if `record_ad_view` function is being called correctly and returning success

### Issue 2: Limit Not Enforced
**Symptom**: User can watch more than 5 ads
**Solution**: Verify `v_daily_limit` is set to 5 in both database functions

### Issue 3: Premium Multiplier Not Working
**Symptom**: Premium users earn 5 coins instead of 12
**Solution**: Check `is_premium` flag in profiles table and multiplier calculation in `record_ad_view`

### Issue 4: Daily Reset Not Working
**Symptom**: Limit doesn't reset the next day
**Solution**: Verify date comparison logic uses `CURRENT_DATE` correctly

## Manual Testing Script

```bash
# Test as regular user
1. Login as test user (non-premium)
2. Navigate to /watch-ads
3. Watch 5 ads, claim each reward
4. Verify total: 25 coins earned
5. Verify button disabled at 5/5

# Test as premium user
1. Login as premium test user
2. Navigate to /watch-ads
3. Watch 5 ads, claim each reward
4. Verify total: 60 coins earned
5. Verify button disabled at 5/5

# Test daily reset
1. Use SQL to advance date:
   UPDATE ad_views SET viewed_at = viewed_at - INTERVAL '1 day' WHERE user_id = 'TEST_USER_UUID';
2. Refresh page
3. Verify stats reset to 0/5
4. Verify can watch ads again
```

## Automated Testing (Future Enhancement)

Consider adding automated tests using:
- Jest for unit tests
- Playwright/Cypress for E2E tests
- Database transaction tests for concurrency

## Success Criteria

✅ **Test passes if**:
- Users can watch exactly 5 ads per day
- Regular users earn 5 coins per ad (25 total)
- Premium users earn 12 coins per ad (60 total)
- 6th ad attempt is blocked with clear message
- Stats accurately reflect progress
- Daily limit resets at midnight
- No duplicate claims possible
- Error handling works correctly

❌ **Test fails if**:
- Users can watch more than 5 ads
- Coins aren't awarded correctly
- Stats don't update
- Limit doesn't reset daily
- Duplicate claims succeed
- System crashes or errors occur
