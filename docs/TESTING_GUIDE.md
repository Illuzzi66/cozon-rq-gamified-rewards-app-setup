# Testing Guide for Cozon RQ Features

## Overview
This guide provides comprehensive testing procedures for the Watch to Earn and Spin Wheel features, including automated test utilities and manual verification steps.

## Quick Access
Navigate to `/test-features` in the app to access the automated testing interface.

---

## Watch to Earn Feature Testing

### Feature Specifications
- **Daily Limit**: 5 ads per user per day
- **Base Reward**: 5 coins per ad
- **Premium Reward**: 12 coins per ad (2.5× multiplier)
- **Reset Time**: Midnight UTC daily

### Test Cases

#### 1. Daily Limit Enforcement
**Objective**: Verify users cannot watch more than 5 ads per day

**Steps**:
1. Navigate to Watch Ads page (`/watch-ads`)
2. Check the counter displays "X/5 ads watched today"
3. Watch ads until reaching 5
4. Verify the "Watch Ad" button becomes disabled
5. Verify message shows "Daily limit reached"
6. Check database: `SELECT * FROM ad_views WHERE user_id = 'USER_ID' AND DATE(created_at) = CURRENT_DATE`
7. Confirm count does not exceed 5

**Expected Results**:
- Counter accurately reflects ads watched
- Button disabled at 5 ads
- Database enforces limit via constraints
- Clear user feedback when limit reached

**Automated Test**: Run "Watch to Earn Tests" in `/test-features`

---

#### 2. Reward Calculation - Free Users
**Objective**: Verify free users receive 5 coins per ad

**Steps**:
1. Ensure test account is NOT premium
2. Note current coin balance
3. Watch one ad
4. Verify balance increases by exactly 5 coins
5. Check database: `SELECT coin_balance FROM profiles WHERE user_id = 'USER_ID'`

**Expected Results**:
- Balance increases by 5 coins
- Database reflects correct amount
- No premium multiplier applied

---

#### 3. Reward Calculation - Premium Users
**Objective**: Verify premium users receive 12 coins per ad (2.5× multiplier)

**Steps**:
1. Ensure test account has premium status
2. Note current coin balance
3. Watch one ad
4. Verify balance increases by exactly 12 coins
5. Check calculation: 5 × 2.5 = 12.5 → floor(12.5) = 12
6. Check database: `SELECT coin_balance, is_premium FROM profiles WHERE user_id = 'USER_ID'`

**Expected Results**:
- Balance increases by 12 coins
- Premium multiplier correctly applied
- Database reflects correct amount

---

#### 4. Duplicate Prevention
**Objective**: Verify users cannot claim rewards multiple times for the same ad

**Steps**:
1. Watch an ad
2. Immediately try to watch another ad (within 2 seconds)
3. Verify system prevents duplicate claim
4. Check for appropriate error message
5. Verify balance only increased once

**Expected Results**:
- Duplicate prevention triggers
- User sees "Please wait before watching another ad" message
- Balance only increases once
- Database has single entry for the ad view

---

#### 5. Stats Refresh
**Objective**: Verify stats update correctly after each ad

**Steps**:
1. Watch an ad
2. Check that "Ads Watched Today" counter increments
3. Check that "Coins Earned Today" updates
4. Check that "Remaining Ads" decrements
5. Verify all stats are accurate

**Expected Results**:
- All counters update in real-time
- Stats match database values
- No stale data displayed

---

## Spin Wheel Feature Testing

### Feature Specifications
- **Spin Cost**: 1 spin from user's spin balance
- **Purchase Price**: 50 coins per spin (with bulk discounts)
- **Daily Bonus**: 2 free spins every 24 hours
- **Watch Ad for Spins**: 3 ads per day = 3 spins
- **Reward Types**: Coins, Money ($0.50, $2), Extra Spins, Loss

### Reward Probabilities
| Reward | Type | Probability |
|--------|------|-------------|
| 10 Coins | Coins | 22% |
| $0.50 (750 coins) | Money | 5% |
| 25 Coins | Coins | 18% |
| Try Again | Loss | 15% |
| 100 Coins | Coins | 5% |
| +2 Spins | Spins | 10% |
| $2 (3000 coins) | Money | 0.5% |
| 50 Coins | Coins | 8% |
| Better Luck | Loss | 5% |
| 500 Coins | Coins | 1.5% |

**Total**: 100% (10 segments)

### Test Cases

#### 1. Spin Deduction
**Objective**: Verify spin balance decreases correctly

**Steps**:
1. Note current spin balance
2. Spin the wheel
3. Verify balance decreased by 1
4. Check database: `SELECT spins_available FROM profiles WHERE user_id = 'USER_ID'`

**Expected Results**:
- Spin balance decreases by 1
- Cannot spin with 0 spins
- Database reflects correct balance

---

#### 2. Reward Distribution
**Objective**: Verify all reward types work correctly

**Steps**:
1. Spin wheel multiple times (at least 10)
2. Record each reward type received
3. Verify coin rewards add to balance
4. Verify money rewards ($0.50 = 750 coins, $2 = 3000 coins)
5. Verify extra spins add to spin balance
6. Verify loss outcomes don't award anything
7. Check spin history: Navigate to spin history section

**Expected Results**:
- All 10 reward types can be won
- Coin amounts match specifications
- Money rewards convert correctly
- Extra spins add to balance
- Loss outcomes recorded properly
- History shows all spins

**Automated Test**: Run "Spin Wheel Tests" in `/test-features`

---

#### 3. Probability Analysis
**Objective**: Verify reward probabilities match expected distribution

**Steps**:
1. Perform 100+ spins (more = better accuracy)
2. Record frequency of each reward
3. Calculate actual percentages
4. Compare to expected probabilities
5. Use automated test for statistical analysis

**Expected Results**:
- Distribution roughly matches expected probabilities
- No reward type is impossible to win
- Rare rewards (500 coins, $2) appear less frequently
- Common rewards (10 coins, 25 coins) appear more frequently

**Note**: With 100 spins, expect ±5% variance. With 1000 spins, expect ±2% variance.

**Automated Test**: Run "Spin Wheel Tests" → "Probability Distribution" in `/test-features`

---

#### 4. Daily Bonus Claim
**Objective**: Verify 24-hour daily bonus works correctly

**Steps**:
1. Check if daily bonus is available
2. If available, claim 2 free spins
3. Verify spin balance increased by 2
4. Verify countdown timer starts (24 hours)
5. Verify cannot claim again until timer expires
6. Check database: `SELECT last_daily_bonus FROM profiles WHERE user_id = 'USER_ID'`

**Expected Results**:
- Bonus claimable every 24 hours
- Adds exactly 2 spins
- Timer displays correctly
- Cannot claim multiple times
- Database tracks last claim time

---

#### 5. Watch Ad for Spins
**Objective**: Verify ad-to-spin conversion works (3 ads max per day)

**Steps**:
1. Navigate to Spin Wheel page
2. Click "Watch Ad for Spins"
3. Complete ad viewing
4. Verify spin balance increased by 1
5. Verify counter shows "X/3 ads watched"
6. Repeat until reaching 3 ads
7. Verify button disabled after 3 ads

**Expected Results**:
- Each ad awards 1 spin
- Maximum 3 ads per day
- Counter accurate
- Button disabled at limit
- Separate from Watch to Earn limit

---

#### 6. Spin Purchase with Coins
**Objective**: Verify coin-to-spin purchase system

**Steps**:
1. Note current coin and spin balances
2. Purchase 1 spin (50 coins)
3. Verify: coins decreased by 50, spins increased by 1
4. Purchase 10 spins (450 coins with 10% discount)
5. Verify: coins decreased by 450, spins increased by 10
6. Purchase 20 spins (800 coins with 20% discount)
7. Verify: coins decreased by 800, spins increased by 20

**Expected Results**:
- 1 spin = 50 coins (no discount)
- 10 spins = 450 coins (10% off, saved 50 coins)
- 20 spins = 800 coins (20% off, saved 200 coins)
- Cannot purchase with insufficient coins
- Balances update correctly

**Automated Test**: Run "Spin Wheel Tests" → "Spin Purchase Discounts" in `/test-features`

---

#### 7. Spin History Tracking
**Objective**: Verify all spins are recorded in history

**Steps**:
1. Perform several spins
2. Navigate to spin history section
3. Verify all spins appear in chronological order
4. Check each entry shows:
   - Reward type
   - Reward amount
   - Timestamp
5. Verify history persists across sessions

**Expected Results**:
- All spins recorded
- Accurate reward information
- Proper timestamps
- History accessible anytime

---

#### 8. Sound Effects
**Objective**: Verify audio feedback works correctly

**Steps**:
1. Ensure device volume is on
2. Spin the wheel → Hear spinning sound
3. Win coins → Hear win sound
4. Get loss outcome → Hear lose sound
5. Claim daily bonus → Hear bonus sound

**Expected Results**:
- All sound effects play at appropriate times
- Sounds don't overlap incorrectly
- Volume is appropriate
- Sounds enhance user experience

---

## Automated Testing

### Using the Test Features Page

1. **Access**: Navigate to `/test-features` or click "Test Features" on Dashboard
2. **Select Tab**: Choose "Watch to Earn" or "Spin Wheel"
3. **Review Stats**: Check current user stats and history
4. **Run Tests**: Click "Run Tests" button
5. **Review Results**: See pass/fail status for each test
6. **Download Report**: Export detailed test report as text file

### Test Coverage

**Watch to Earn Tests**:
- ✓ Daily limit enforcement (5 ads)
- ✓ Free user rewards (5 coins)
- ✓ Premium user rewards (12 coins)
- ✓ Current user reward calculation

**Spin Wheel Tests**:
- ✓ Reward types configuration (10 segments)
- ✓ Probability distribution analysis
- ✓ Money reward mapping ($0.50 = 750, $2 = 3000)
- ✓ Bulk purchase discounts (10%, 20%)

### Interpreting Results

**Pass (✓)**: Feature working as expected
**Fail (✗)**: Issue detected, review details

Each test result includes:
- Test name
- Pass/fail status
- Detailed message
- Timestamp
- Additional details (expandable)

---

## Database Verification Queries

### Watch to Earn
```sql
-- Check daily ad views for a user
SELECT COUNT(*) as ads_watched_today
FROM ad_views
WHERE user_id = 'USER_ID'
  AND DATE(created_at) = CURRENT_DATE;

-- Check total earnings from ads
SELECT SUM(coins_earned) as total_ad_earnings
FROM ad_views
WHERE user_id = 'USER_ID';

-- Verify ad view timestamps (duplicate check)
SELECT created_at, coins_earned
FROM ad_views
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Spin Wheel
```sql
-- Check spin balance
SELECT spins_available, coin_balance
FROM profiles
WHERE user_id = 'USER_ID';

-- View spin history
SELECT reward_type, reward_amount, created_at
FROM spin_history
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 20;

-- Analyze reward distribution
SELECT 
  reward_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM spin_history
WHERE user_id = 'USER_ID'
GROUP BY reward_type;

-- Check last daily bonus claim
SELECT last_daily_bonus
FROM profiles
WHERE user_id = 'USER_ID';
```

---

## Common Issues and Troubleshooting

### Watch to Earn

**Issue**: Coins not updating after ad
- **Check**: Database connection
- **Verify**: `record_ad_view` function executed successfully
- **Solution**: Refresh profile data, check error logs

**Issue**: Can watch more than 5 ads
- **Check**: Database constraint on `ad_views` table
- **Verify**: Daily count calculation in `get_daily_ad_stats`
- **Solution**: Review duplicate prevention logic

**Issue**: Premium multiplier not applied
- **Check**: User's `is_premium` status in database
- **Verify**: Reward calculation in `record_ad_view` function
- **Solution**: Ensure premium status is active

### Spin Wheel

**Issue**: Spin balance not decreasing
- **Check**: `perform_spin` function execution
- **Verify**: Database transaction completed
- **Solution**: Check for errors in console/logs

**Issue**: Wrong reward amount
- **Check**: Wheel segment configuration
- **Verify**: Reward mapping (especially money rewards)
- **Solution**: Review `wheelSegments` array in SpinWheel component

**Issue**: Probability seems off
- **Check**: Sample size (need 100+ spins for accuracy)
- **Verify**: Random number generation
- **Solution**: Use automated probability test with large sample

**Issue**: Daily bonus not resetting
- **Check**: `last_daily_bonus` timestamp
- **Verify**: 24-hour calculation logic
- **Solution**: Ensure timezone handling is correct

---

## Performance Testing

### Load Testing
1. Create multiple test accounts
2. Simulate concurrent ad watching
3. Verify database handles load
4. Check for race conditions
5. Monitor response times

### Stress Testing
1. Rapidly click buttons (duplicate prevention)
2. Watch ads in quick succession
3. Spin wheel multiple times rapidly
4. Verify system remains stable

---

## Regression Testing Checklist

After any code changes, verify:
- [ ] Watch to Earn daily limit still enforced
- [ ] Reward calculations remain accurate
- [ ] Spin wheel probabilities unchanged
- [ ] Daily bonus timer works correctly
- [ ] Purchase discounts calculate properly
- [ ] All sound effects play
- [ ] History tracking persists
- [ ] Database constraints active
- [ ] Duplicate prevention functional
- [ ] UI displays correct information

---

## Test Data Setup

### Creating Test Accounts
```sql
-- Create free user test account
INSERT INTO profiles (user_id, username, email, is_premium, coin_balance, spins_available)
VALUES ('test-free-user', 'testfree', 'free@test.com', false, 1000, 5);

-- Create premium user test account
INSERT INTO profiles (user_id, username, email, is_premium, coin_balance, spins_available)
VALUES ('test-premium-user', 'testpremium', 'premium@test.com', true, 1000, 5);
```

### Resetting Test Data
```sql
-- Reset ad views for testing
DELETE FROM ad_views WHERE user_id = 'TEST_USER_ID';

-- Reset spin history
DELETE FROM spin_history WHERE user_id = 'TEST_USER_ID';

-- Reset daily bonus
UPDATE profiles 
SET last_daily_bonus = NOW() - INTERVAL '25 hours'
WHERE user_id = 'TEST_USER_ID';

-- Add test spins
UPDATE profiles 
SET spins_available = 10
WHERE user_id = 'TEST_USER_ID';
```

---

## Reporting Issues

When reporting bugs, include:
1. **Feature**: Watch to Earn or Spin Wheel
2. **Test Case**: Which test failed
3. **Expected**: What should happen
4. **Actual**: What actually happened
5. **Steps**: How to reproduce
6. **Environment**: Browser, device, user type
7. **Screenshots**: If applicable
8. **Database State**: Relevant query results
9. **Console Logs**: Any errors or warnings

---

## Conclusion

This testing guide ensures both Watch to Earn and Spin Wheel features work correctly and provide a fair, engaging experience for users. Regular testing helps maintain feature quality and catch issues early.

For automated testing, use the `/test-features` page. For manual verification, follow the step-by-step test cases above.

**Happy Testing! 🧪**
