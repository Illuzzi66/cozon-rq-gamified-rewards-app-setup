# Duplicate Prevention System

## Overview
Comprehensive multi-layer duplicate prevention system to prevent double-submissions, rapid-fire clicks, and race conditions across the entire application.

## Database Layer Protection

### 1. Trigger-Based Time Windows
Prevents rapid-fire duplicate entries within specific time windows:

- **Ad Views**: 3-second window
  - Prevents double-clicking "Watch Ad" button
  - Trigger: `prevent_duplicate_ad_view_trigger`

- **Comments**: 2-second window
  - Prevents rapid comment spam
  - Trigger: `prevent_duplicate_comment_trigger`

- **Spins**: 5-second window
  - Prevents spinning during animation
  - Trigger: `prevent_duplicate_spin_trigger`

- **Task Completions**: 2-second window
  - Prevents double task completion
  - Trigger: `prevent_duplicate_task_completion_trigger`

### 2. Row-Level Locking
All critical database functions use `FOR UPDATE` locks:
- `record_ad_view()` - Locks user profile during ad processing
- `like_meme()` - Locks user profile during like processing
- `comment_on_meme()` - Locks user profile during comment processing
- `complete_task()` - Locks user profile during task completion

### 3. Unique Constraints
- `meme_likes`: Unique constraint on `(user_id, meme_id)`
- Prevents duplicate likes at database level

## Client-Side Protection

### 1. State-Based Guards
All action handlers check processing state before executing:

```typescript
if (processingState) {
  toast({ title: 'Please Wait', description: 'Processing...' });
  return;
}
```

Applied to:
- `WatchAds.tsx`: `balanceUpdating` state
- `MemeFeed.tsx`: `processingLike`, `processingComment` states
- `SpinWheel.tsx`: `spinning` state
- `Tasks.tsx`: `completingTask` state

### 2. User Feedback
Enhanced error messages distinguish between:
- Duplicate attempts: "Too Fast! Please wait..."
- Already completed: "Already liked/completed..."
- System errors: "Failed to process. Please try again."

### 3. Utility Functions
Created `src/utils/debounce.ts` with:
- `debounce()` - Delays function execution
- `throttle()` - Limits execution rate
- `AsyncMutex` - Prevents concurrent async operations

## How It Works

### Example: Watching an Ad

1. **User clicks "Watch Ad"**
2. **Client checks**: Is `balanceUpdating` true?
   - Yes → Show "Please Wait" toast, exit
   - No → Continue
3. **Client sets**: `balanceUpdating = true`
4. **Database locks**: User profile row with `FOR UPDATE`
5. **Database checks**: Any ad views in last 3 seconds?
   - Yes → Trigger raises exception
   - No → Continue
6. **Database inserts**: Ad view record
7. **Database updates**: User balance
8. **Client receives**: Success response
9. **Client sets**: `balanceUpdating = false`

### Race Condition Prevention

Even if two requests arrive simultaneously:
1. First request acquires row lock
2. Second request waits for lock
3. First request completes, releases lock
4. Second request acquires lock
5. Second request fails trigger check (within 3 seconds)
6. User sees "Too Fast!" message

## Testing Duplicate Prevention

To test the system:
1. Rapidly click any action button (like, comment, spin, watch ad)
2. Expected behavior:
   - First click processes normally
   - Subsequent clicks within time window show "Please Wait" or "Too Fast!"
   - No duplicate database entries created
   - Balance updates only once

## Monitoring

Check for duplicates with:
```sql
-- Check for rapid-fire entries
SELECT user_id, COUNT(*) as rapid_count
FROM ad_views
WHERE viewed_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id, DATE_TRUNC('second', viewed_at)
HAVING COUNT(*) > 1;
```

## Configuration

Time windows can be adjusted in database triggers:
- Ad views: 3 seconds (in `prevent_duplicate_ad_view()`)
- Comments: 2 seconds (in `prevent_duplicate_comment()`)
- Spins: 5 seconds (in `prevent_duplicate_spin()`)
- Tasks: 2 seconds (in `prevent_duplicate_task_completion()`)

## Benefits

1. **Data Integrity**: No duplicate records in database
2. **Fair Rewards**: Users can't exploit double-clicking
3. **Better UX**: Clear feedback on why actions are blocked
4. **Performance**: Reduces unnecessary database operations
5. **Scalability**: Handles concurrent users safely
