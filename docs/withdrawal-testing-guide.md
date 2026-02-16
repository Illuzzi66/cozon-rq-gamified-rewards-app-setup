# Complete Withdrawal Flow Testing Guide

This guide provides step-by-step instructions for testing the complete withdrawal flow with real Paystack transfers.

## Prerequisites

### 1. Paystack Account Setup
- ✅ Paystack account created
- ✅ API keys stored in Supabase Vault (PAYSTACK_SECRET_KEY)
- ✅ Paystack account funded with test/live balance
- ⚠️ Bank account verified for transfers
- ⚠️ Transfer feature enabled in Paystack dashboard

### 2. Email Service Setup
- ✅ Resend API key stored (RESEND_API_KEY)
- ⚠️ Domain verified in Resend (see docs/email-domain-setup.md)
- ⚠️ Test email address configured

### 3. Edge Functions Deployed
- ✅ `process-withdrawal` - Handles Paystack payment processing
- ✅ `paystack-webhook` - Receives transfer status updates
- ✅ `retry-failed-withdrawal` - Retries failed payments
- ✅ `send-email-notification` - Sends email notifications

### 4. Webhook Configuration
- ⚠️ **CRITICAL**: Configure webhook URL in Paystack dashboard
- URL: `https://dhzgnxfhcgjzlzmfdfid.supabase.co/functions/v1/paystack-webhook`
- Events to subscribe: `transfer.success`, `transfer.failed`, `transfer.reversed`

---

## Testing Workflow

### Phase 1: User Withdrawal Request

#### Step 1: Create Test User Account
1. Sign up with a test email address
2. Verify the account has sufficient coins (minimum 7,500 coins = $5)
3. If needed, use admin panel to add coins for testing

#### Step 2: Add Bank Account Details
1. Navigate to Wallet page
2. Click "Withdraw Funds"
3. Enter valid Nigerian bank details:
   - **Bank Name**: Select from dropdown (e.g., "Access Bank")
   - **Account Number**: 10-digit account number
   - **Account Name**: Will be auto-verified by Paystack
4. Enter withdrawal amount (minimum $5)
5. Submit withdrawal request

**Expected Result:**
- ✅ Withdrawal request created with status "pending"
- ✅ Coins deducted from user balance immediately
- ✅ Withdrawal appears in user's withdrawal history
- ✅ User receives notification: "Withdrawal request submitted"

**Database Check:**
```sql
SELECT * FROM withdrawals 
WHERE user_id = '[user_id]' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Phase 2: Admin Approval & Payment Processing

#### Step 3: Admin Reviews Withdrawal
1. Log in as admin user
2. Navigate to Admin Dashboard
3. Click "Withdrawals" tab
4. View pending withdrawal requests

**Expected Display:**
- User details (username, email)
- Withdrawal amount (coins and USD)
- Bank details (name, account number)
- Request timestamp
- Action buttons (Approve/Reject)

#### Step 4: Approve Withdrawal
1. Click "Approve" button on the withdrawal
2. Confirm approval in dialog

**Expected Backend Process:**
1. Edge function `process-withdrawal` is invoked
2. Creates Paystack transfer recipient
3. Initiates Paystack transfer
4. Updates withdrawal status to "completed"
5. Stores Paystack reference and transfer code
6. Creates notification for user
7. Triggers email notification

**Expected Result:**
- ✅ Withdrawal status changes to "completed"
- ✅ Admin sees success message
- ✅ User receives notification: "🎉 Withdrawal Approved!"
- ✅ Email sent to user with payment details

**Database Check:**
```sql
SELECT 
  id,
  status,
  amount,
  payment_details->>'paystack_reference' as reference,
  payment_details->>'paystack_transfer_code' as transfer_code,
  processed_at,
  admin_note
FROM withdrawals 
WHERE id = '[withdrawal_id]';
```

**Paystack Dashboard Check:**
1. Log in to Paystack dashboard
2. Navigate to Transfers section
3. Find transfer by reference (WD-[withdrawal_id]-[timestamp])
4. Verify transfer status and amount

---

### Phase 3: Webhook Status Updates

#### Step 5: Monitor Transfer Status
Paystack will send webhook events as the transfer progresses:

**Event 1: transfer.success**
- Transfer completed successfully
- Money credited to recipient's account
- Webhook updates withdrawal status to "completed"
- Email sent: "✅ Payment Successful"

**Event 2: transfer.failed**
- Transfer failed (insufficient balance, invalid account, etc.)
- Webhook updates withdrawal status to "failed"
- Coins refunded to user automatically
- Email sent: "❌ Payment Failed"
- Retry mechanism triggered

**Event 3: transfer.reversed**
- Transfer was reversed by bank
- Webhook updates withdrawal status to "reversed"
- Coins refunded to user automatically
- Email sent: "↻ Payment Reversed"

**Expected Webhook Behavior:**
```
POST /functions/v1/paystack-webhook
Headers:
  x-paystack-signature: [signature]
Body:
{
  "event": "transfer.success",
  "data": {
    "reference": "WD-[withdrawal_id]-[timestamp]",
    "status": "success",
    "amount": 500000,
    "recipient": {...}
  }
}
```

**Database Check After Webhook:**
```sql
SELECT 
  id,
  status,
  payment_details->>'paystack_status' as paystack_status,
  payment_details->>'failure_reason' as failure_reason,
  retry_count,
  last_retry_at
FROM withdrawals 
WHERE id = '[withdrawal_id]';
```

---

### Phase 4: Email Notifications

#### Step 6: Verify Email Delivery
Check recipient inbox for emails:

**Email 1: Withdrawal Approved**
- Subject: "🎉 Withdrawal Approved - Cozon RQ"
- Content: Approval confirmation, amount, processing notice
- Sent immediately after admin approval

**Email 2: Payment Status Update**
- Subject varies by status:
  - "✅ Payment Successful - Cozon RQ"
  - "❌ Payment Failed - Cozon RQ"
  - "↻ Payment Reversed - Cozon RQ"
- Content: Status details, reference number, next steps
- Sent after webhook receives status update

**Resend Dashboard Check:**
1. Log in to Resend dashboard
2. Navigate to Emails section
3. Verify emails were sent successfully
4. Check delivery status and open rates

---

### Phase 5: Failure Handling & Retries

#### Step 7: Test Failed Payment Scenario
To test failure handling:

**Option A: Insufficient Paystack Balance**
1. Ensure Paystack account has insufficient balance
2. Approve a withdrawal
3. Transfer will fail with "Insufficient balance" error

**Option B: Invalid Bank Account**
1. Submit withdrawal with invalid account number
2. Approve withdrawal
3. Transfer will fail with "Invalid account" error

**Expected Failure Behavior:**
1. Withdrawal status updates to "failed"
2. Failure reason stored in payment_details
3. Coins automatically refunded to user
4. User receives failure notification and email
5. Retry mechanism triggered (if retryable error)

**Retry Mechanism:**
- Automatic retry after 5 minutes (first attempt)
- Automatic retry after 30 minutes (second attempt)
- Automatic retry after 2 hours (third attempt)
- Maximum 3 retry attempts
- Admin can manually retry from dashboard

**Manual Retry Test:**
1. Navigate to Admin Dashboard → Withdrawals
2. Find failed withdrawal
3. Click "Retry Payment" button
4. Verify retry attempt is logged

**Database Check:**
```sql
SELECT 
  id,
  status,
  retry_count,
  last_retry_at,
  payment_details->>'failure_reason' as failure_reason,
  payment_details->>'retry_history' as retry_history
FROM withdrawals 
WHERE status = 'failed';
```

---

### Phase 6: User Experience Verification

#### Step 8: User Wallet View
1. Log in as the test user
2. Navigate to Wallet page
3. Verify withdrawal history display

**Expected Display:**
- Withdrawal amount (coins and USD)
- Status badge (Pending/Completed/Failed/Reversed)
- Bank details
- Submission date
- Processing date (if completed)
- Rejection reason (if rejected)
- Paystack reference (if completed)

#### Step 9: Notification History
1. Navigate to Notifications page
2. Verify all withdrawal-related notifications

**Expected Notifications:**
- "Withdrawal request submitted" (on submission)
- "🎉 Withdrawal Approved!" (on approval)
- "✅ Payment Successful" (on success)
- "❌ Payment Failed" (on failure)
- "↻ Payment Reversed" (on reversal)

---

## Test Scenarios

### Scenario 1: Successful Withdrawal (Happy Path)
1. User requests $5 withdrawal
2. Admin approves
3. Paystack processes successfully
4. User receives money in 1-2 business days
5. All notifications and emails sent

**Expected Timeline:**
- T+0: Request submitted
- T+5min: Admin approves, payment initiated
- T+10min: Webhook confirms success
- T+1-2 days: Money in user's bank account

### Scenario 2: Failed Payment with Retry
1. User requests withdrawal
2. Admin approves
3. Paystack fails (insufficient balance)
4. System retries automatically
5. Second attempt succeeds
6. User receives money

**Expected Timeline:**
- T+0: Request submitted
- T+5min: Admin approves, payment fails
- T+10min: First retry (fails)
- T+40min: Second retry (succeeds)
- T+1-2 days: Money in user's bank account

### Scenario 3: Rejected Withdrawal
1. User requests withdrawal
2. Admin reviews and rejects
3. Coins refunded immediately
4. User receives rejection notification

**Expected Result:**
- Withdrawal status: "rejected"
- Coins refunded to user balance
- Rejection reason visible to user

### Scenario 4: Reversed Payment
1. User requests withdrawal
2. Admin approves, payment succeeds
3. Bank reverses transfer (invalid account)
4. Webhook updates status
5. Coins refunded to user

**Expected Result:**
- Withdrawal status: "reversed"
- Coins refunded automatically
- User notified of reversal

---

## Monitoring & Analytics

### Admin Dashboard Metrics
Track these metrics in admin dashboard:

**Withdrawal Statistics:**
- Total withdrawals processed
- Total amount paid out
- Success rate (%)
- Average processing time
- Pending requests count
- Failed payments count

**Payment Health:**
- Paystack balance status
- Recent failures and reasons
- Retry success rate
- Email delivery rate

### Database Queries for Monitoring

**Daily Withdrawal Summary:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(amount) as total_amount
FROM withdrawals
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Failure Analysis:**
```sql
SELECT 
  payment_details->>'failure_reason' as failure_reason,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM withdrawals
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY failure_reason
ORDER BY count DESC;
```

**Retry Performance:**
```sql
SELECT 
  retry_count,
  COUNT(*) as withdrawal_count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as avg_hours_to_complete
FROM withdrawals
WHERE status = 'completed'
  AND retry_count > 0
GROUP BY retry_count
ORDER BY retry_count;
```

---

## Troubleshooting

### Issue: Webhook Not Receiving Events
**Solution:**
1. Verify webhook URL in Paystack dashboard
2. Check edge function logs: `supabase functions logs paystack-webhook`
3. Test webhook manually using Paystack dashboard
4. Verify webhook signature validation

### Issue: Emails Not Sending
**Solution:**
1. Check Resend API key is configured
2. Verify domain is verified in Resend
3. Check edge function logs: `supabase functions logs send-email-notification`
4. Test email function manually

### Issue: Payment Fails Immediately
**Solution:**
1. Check Paystack account balance
2. Verify bank account details are correct
3. Check Paystack dashboard for error details
4. Review edge function logs: `supabase functions logs process-withdrawal`

### Issue: Coins Not Refunded on Failure
**Solution:**
1. Check webhook is receiving events
2. Verify refund logic in webhook handler
3. Manually refund using admin dashboard
4. Check database triggers are active

---

## Security Checklist

- [ ] Paystack API keys stored in Supabase Vault (not in code)
- [ ] Webhook signature validation enabled
- [ ] HTTPS enforced for all webhook endpoints
- [ ] Admin-only access to withdrawal approval
- [ ] Row-level security on withdrawals table
- [ ] Audit logging for all withdrawal actions
- [ ] Rate limiting on withdrawal requests
- [ ] Duplicate prevention mechanisms active

---

## Production Readiness Checklist

- [ ] Paystack account verified and funded
- [ ] Domain verified in Resend for emails
- [ ] Webhook URL configured in Paystack
- [ ] All edge functions deployed and tested
- [ ] Email templates reviewed and approved
- [ ] Admin dashboard tested with real data
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures documented
- [ ] User support process defined
- [ ] Legal compliance verified (KYC, AML, etc.)

---

## Next Steps

1. **Configure Webhook URL**: Add webhook URL to Paystack dashboard
2. **Test with Small Amounts**: Start with minimum withdrawals ($5)
3. **Monitor First 10 Transactions**: Closely watch first real withdrawals
4. **Gather User Feedback**: Collect feedback on withdrawal experience
5. **Optimize Processing Time**: Reduce approval and processing delays
6. **Scale Gradually**: Increase withdrawal limits as system proves stable

---

## Support Resources

- **Paystack Documentation**: https://paystack.com/docs/transfers/single-transfers
- **Paystack Webhooks**: https://paystack.com/docs/payments/webhooks
- **Resend Documentation**: https://resend.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

## Emergency Contacts

- **Paystack Support**: support@paystack.com
- **Resend Support**: support@resend.com
- **Supabase Support**: support@supabase.com
