# Email Domain Verification Setup Guide

This guide will help you set up a custom domain for sending professional emails from Cozon RQ.

## Prerequisites
- A domain name (e.g., cozonrq.com)
- Access to your domain's DNS settings
- Resend API key (already configured)

## Step 1: Add Domain to Resend

1. Log in to your Resend dashboard at https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain name (e.g., `cozonrq.com`)
4. Click "Add"

## Step 2: Configure DNS Records

Resend will provide you with DNS records to add to your domain. You'll need to add these records through your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.).

### Required DNS Records:

#### SPF Record (TXT)
```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### DKIM Records (CNAME)
Resend will provide 3 CNAME records that look like this:
```
Type: CNAME
Name: resend._domainkey
Value: [provided by Resend]
TTL: 3600

Type: CNAME
Name: resend2._domainkey
Value: [provided by Resend]
TTL: 3600

Type: CNAME
Name: resend3._domainkey
Value: [provided by Resend]
TTL: 3600
```

#### DMARC Record (TXT) - Optional but Recommended
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@cozonrq.com
TTL: 3600
```

## Step 3: Verify Domain

1. After adding all DNS records, return to Resend dashboard
2. Click "Verify" next to your domain
3. Verification may take a few minutes to 48 hours (usually within 15 minutes)
4. Once verified, you'll see a green checkmark

## Step 4: Update Email Function

Once your domain is verified, update the default sender address in the email function:

```typescript
// In supabase/functions/send-email-notification/index.ts
const { from = 'Cozon RQ <noreply@cozonrq.com>' }: EmailRequest = await req.json();
```

Replace `noreply@cozonrq.com` with your verified domain email.

## Step 5: Test Email Sending

Test the email system by:
1. Requesting a withdrawal in the app
2. Approving it as admin
3. Checking if the email arrives with your custom domain

## Common DNS Providers

### Cloudflare
1. Go to DNS settings
2. Click "Add record"
3. Select record type (TXT or CNAME)
4. Enter name and value
5. Save

### GoDaddy
1. Go to DNS Management
2. Click "Add"
3. Select record type
4. Enter details
5. Save

### Namecheap
1. Go to Advanced DNS
2. Click "Add New Record"
3. Select type
4. Enter host and value
5. Save

## Troubleshooting

### Domain Not Verifying
- Wait 24-48 hours for DNS propagation
- Check DNS records using tools like https://mxtoolbox.com/
- Ensure no typos in DNS values
- Remove any duplicate records

### Emails Going to Spam
- Ensure all DNS records are properly configured
- Add DMARC record
- Warm up your domain by sending gradually increasing volumes
- Avoid spam trigger words in subject lines

### Email Delivery Issues
- Check Resend dashboard for delivery logs
- Verify recipient email addresses are valid
- Check if your domain has been blacklisted
- Review bounce and complaint rates

## Best Practices

1. **Use Subdomain**: Consider using `mail.cozonrq.com` instead of root domain
2. **Monitor Metrics**: Regularly check Resend dashboard for delivery rates
3. **Handle Bounces**: Implement bounce handling to maintain sender reputation
4. **Unsubscribe Links**: Add unsubscribe options for marketing emails
5. **Rate Limiting**: Don't send too many emails at once when starting

## Email Templates

The system currently sends emails for:
- ✅ Successful withdrawals
- ❌ Failed withdrawals
- ↻ Reversed withdrawals

All templates are branded with Cozon RQ colors and logo.

## Support

- Resend Documentation: https://resend.com/docs
- Resend Support: support@resend.com
- DNS Propagation Checker: https://dnschecker.org/

## Security Notes

- Never share your Resend API key
- API key is stored securely in Supabase Vault
- Use environment variables, never hardcode keys
- Regularly rotate API keys for security

---

**Next Steps After Setup:**
1. Configure webhook URL in Paystack dashboard
2. Test complete withdrawal flow with real payments
3. Monitor email delivery rates in Resend dashboard
4. Set up email analytics tracking
