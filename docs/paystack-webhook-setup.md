# Paystack Webhook Configuration Guide

This guide provides step-by-step instructions for configuring the webhook URL in your Paystack dashboard to receive transfer status updates.

## Why Webhooks Are Important

Webhooks allow Paystack to notify your application when transfer statuses change (success, failed, reversed). Without webhooks configured, your system won't receive automatic updates about payment status, and users won't get timely notifications about their withdrawals.

---

## Configuration Steps

### Step 1: Log in to Paystack Dashboard

1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Log in with your Paystack account credentials
3. Ensure you're in the correct environment (Test or Live)

### Step 2: Navigate to Settings

1. Click on **Settings** in the left sidebar
2. Select **Webhooks** from the settings menu

### Step 3: Add Webhook URL

1. Click the **Add Webhook** button (or **Configure Webhook** if this is your first webhook)
2. In the **Webhook URL** field, enter:
   ```
   https://dhzgnxfhcgjzlzmfdfid.supabase.co/functions/v1/paystack-webhook
   ```
3. Ensure the URL is entered exactly as shown above (no trailing slash)

### Step 4: Select Events to Subscribe

Select the following events by checking their boxes:

- ✅ **transfer.success** - Triggered when a transfer is successful
- ✅ **transfer.failed** - Triggered when a transfer fails
- ✅ **transfer.reversed** - Triggered when a transfer is reversed

**Important:** Make sure ONLY these three events are selected. Uncheck any other events to avoid unnecessary webhook calls.

### Step 5: Save Configuration

1. Click the **Save** button at the bottom of the page
2. Paystack will display your webhook configuration
3. Note the **Secret Key** shown - this is used to verify webhook signatures (already configured in your edge function)

### Step 6: Test Webhook (Optional but Recommended)

1. In the webhook configuration page, find the **Test Webhook** button
2. Click it to send a test event to your endpoint
3. Verify that the test is successful (you should see a green checkmark)

---

## Verification

After configuration, verify the webhook is working:

### Method 1: Check Paystack Dashboard

1. Navigate to **Developers** → **Webhooks** in Paystack dashboard
2. You should see your webhook URL listed with status **Active**
3. Check the **Recent Deliveries** section to see webhook events

### Method 2: Test with Real Transfer

1. Process a small test withdrawal ($5 minimum)
2. Monitor the webhook delivery in Paystack dashboard
3. Check your application's withdrawal status updates
4. Verify user receives email notifications

### Method 3: Check Edge Function Logs

Run this command to view webhook logs:
```bash
supabase functions logs paystack-webhook --limit 50
```

Look for entries showing webhook events being received and processed.

---

## Webhook Event Examples

### transfer.success Event
```json
{
  "event": "transfer.success",
  "data": {
    "amount": 500000,
    "currency": "NGN",
    "domain": "live",
    "failures": null,
    "id": 123456789,
    "integration": 987654,
    "reason": "Withdrawal for user123",
    "reference": "WD-abc123-1234567890",
    "source": "balance",
    "source_details": null,
    "status": "success",
    "titan_code": null,
    "transfer_code": "TRF_xyz789",
    "transferred_at": "2024-02-16T10:30:00.000Z",
    "recipient": {
      "domain": "live",
      "type": "nuban",
      "currency": "NGN",
      "name": "John Doe",
      "details": {
        "account_number": "0123456789",
        "account_name": "John Doe",
        "bank_code": "044",
        "bank_name": "Access Bank"
      }
    },
    "session": {
      "provider": null,
      "id": null
    },
    "created_at": "2024-02-16T10:25:00.000Z",
    "updated_at": "2024-02-16T10:30:00.000Z"
  }
}
```

### transfer.failed Event
```json
{
  "event": "transfer.failed",
  "data": {
    "amount": 500000,
    "currency": "NGN",
    "domain": "live",
    "failures": {
      "code": "INSUFFICIENT_BALANCE",
      "message": "Insufficient balance in your Paystack account"
    },
    "id": 123456789,
    "reference": "WD-abc123-1234567890",
    "status": "failed",
    "transfer_code": "TRF_xyz789",
    "created_at": "2024-02-16T10:25:00.000Z",
    "updated_at": "2024-02-16T10:26:00.000Z"
  }
}
```

---

## Troubleshooting

### Issue: Webhook URL Returns 404

**Cause:** Edge function not deployed or incorrect URL

**Solution:**
1. Verify edge function is deployed: `supabase functions list`
2. Check the URL is exactly: `https://dhzgnxfhcgjzlzmfdfid.supabase.co/functions/v1/paystack-webhook`
3. Redeploy if needed: `supabase functions deploy paystack-webhook`

### Issue: Webhook Signature Verification Fails

**Cause:** Incorrect secret key or signature validation logic

**Solution:**
1. Verify Paystack secret key is stored in Supabase Vault
2. Check edge function logs for signature validation errors
3. Ensure webhook secret matches your Paystack account

### Issue: Webhooks Not Being Received

**Cause:** Firewall blocking, incorrect event selection, or inactive webhook

**Solution:**
1. Verify webhook status is **Active** in Paystack dashboard
2. Check correct events are selected (transfer.success, transfer.failed, transfer.reversed)
3. Test webhook delivery using Paystack's test feature
4. Check edge function logs for incoming requests

### Issue: Duplicate Webhook Events

**Cause:** Paystack may retry failed webhook deliveries

**Solution:**
- Edge function already handles idempotency using withdrawal reference
- Duplicate events are safely ignored
- No action needed - this is expected behavior

---

## Security Best Practices

1. **Always Verify Signatures**: The edge function validates webhook signatures to ensure requests are from Paystack
2. **Use HTTPS Only**: Never use HTTP for webhook URLs
3. **Keep Secret Keys Secure**: Store in Supabase Vault, never in code
4. **Monitor Webhook Activity**: Regularly check webhook logs for suspicious activity
5. **Limit Event Subscriptions**: Only subscribe to events you need

---

## Webhook Status Monitoring

### Daily Checks
- Review webhook delivery success rate in Paystack dashboard
- Check for failed deliveries and investigate causes
- Monitor edge function error logs

### Weekly Reviews
- Analyze webhook performance metrics
- Review retry patterns and success rates
- Update webhook configuration if needed

### Monthly Audits
- Verify webhook security settings
- Review and update event subscriptions
- Test webhook failover scenarios

---

## Next Steps After Configuration

1. ✅ Webhook URL configured in Paystack dashboard
2. ⏭️ Test with small withdrawal ($5)
3. ⏭️ Monitor webhook delivery in Paystack dashboard
4. ⏭️ Verify email notifications are sent
5. ⏭️ Check user receives status updates
6. ⏭️ Review edge function logs for errors
7. ⏭️ Process larger test withdrawals
8. ⏭️ Enable for production use

---

## Support Resources

- **Paystack Webhooks Documentation**: https://paystack.com/docs/payments/webhooks
- **Paystack Transfer Events**: https://paystack.com/docs/transfers/single-transfers#webhook-events
- **Paystack Support**: support@paystack.com
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

## Configuration Checklist

- [ ] Logged in to Paystack dashboard
- [ ] Navigated to Settings → Webhooks
- [ ] Added webhook URL: `https://dhzgnxfhcgjzlzmfdfid.supabase.co/functions/v1/paystack-webhook`
- [ ] Selected events: transfer.success, transfer.failed, transfer.reversed
- [ ] Saved configuration
- [ ] Tested webhook delivery
- [ ] Verified webhook status is Active
- [ ] Checked edge function logs
- [ ] Processed test withdrawal
- [ ] Confirmed email notifications work

Once all items are checked, your webhook configuration is complete and ready for production use!
