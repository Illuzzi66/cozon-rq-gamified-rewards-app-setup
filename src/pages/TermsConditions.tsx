import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TermsConditions: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/signup">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign Up
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
            <p className="text-muted-foreground">Cozon RQ (Reward Quest)</p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Effective Date:</strong> February 17, 2026</p>
            <p><strong className="text-foreground">Last Updated:</strong> February 17, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Reward Quest ("App", "we", "our", "us"). By accessing or using our app, you agree to these Terms & Conditions. If you do not agree, please do not use the app.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Reward Quest allows users to earn coins by completing tasks, watching videos, participating in the community, and using other app features. Coins may be redeemed subject to admin approval.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Account Registration</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Users may register for free</li>
              <li>Optional Premium unlock ($2) grants additional earning features</li>
              <li>You must provide accurate information during registration</li>
              <li>Only one account per person/device is allowed</li>
              <li>We reserve the right to suspend or ban accounts if fraud or abuse is detected</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Coins and Rewards</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Coins are the in-app currency and do not have guaranteed monetary value until redeemed</li>
              <li>Coin earnings vary depending on activity and user tier (Free or Premium)</li>
              <li>Premium users earn 2.5× coins compared to Free users</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Coins may be earned through:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-8">
              <li>Watching rewarded video ads</li>
              <li>Completing tasks or missions</li>
              <li>Posting memes (Premium only)</li>
              <li>Receiving reactions or comments on Premium content</li>
              <li>Referral rewards (only after referred user becomes Premium)</li>
            </ul>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-3">
              <li>Admin may adjust coin values and multipliers at any time</li>
              <li>Abuse, self-interaction, botting, or any form of fraud may result in coin forfeiture</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Withdrawals</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Minimum withdrawal is $5 (5,000 coins)</li>
              <li>All withdrawal requests are manually reviewed by the admin</li>
              <li>Admin may approve or decline withdrawals for any reason, including suspected abuse or violation of Terms</li>
              <li>Approved withdrawals are paid via the payment methods listed in-app</li>
              <li>Coins will only be deducted after successful withdrawal approval</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Ads and Monetization</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our app contains:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Rewarded video ads (grant coins to users)</li>
              <li>Interstitial / banner ads (monetization for app owner only)</li>
              <li>Ads that must be watched to post content or continue activities</li>
            </ul>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-3">
              <li>By using the app, you agree to view ads as required</li>
              <li>Ads may appear at random or timed intervals (e.g., every 5 minutes of active session)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Community Guidelines</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Users may post memes (Premium only) and interact with other users' content</li>
              <li>Users must not post illegal, offensive, or inappropriate content</li>
              <li>Admin may remove content or suspend users for violation of community rules</li>
              <li>Reactions, likes, and comments are limited to prevent abuse</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Premium Access</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Premium unlock is $2 (one-time)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Unlocking Premium grants additional features, including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-8">
              <li>Higher coin earning rates</li>
              <li>Ability to post memes</li>
              <li>Priority in withdrawal queue</li>
            </ul>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-3">
              <li>Premium is optional, but required to access certain earning features</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users must not:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Create multiple accounts to exploit rewards</li>
              <li>Use bots or scripts</li>
              <li>Click on ads to generate revenue fraudulently</li>
              <li>Attempt to bypass app rules or exploit vulnerabilities</li>
              <li>Post offensive, illegal, or copyrighted content</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Violation may result in:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Coin deduction</li>
              <li>Temporary or permanent account suspension</li>
              <li>Ban from app features or withdrawal denial</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Changes to Terms</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>We may update these Terms & Conditions at any time</li>
              <li>Users will be notified via the app or email</li>
              <li>Continued use of the app after updates constitutes acceptance</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Limitation of Liability</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Reward Quest is not responsible for losses, delays, or errors in coin accumulation or withdrawals</li>
              <li>Coins are not guaranteed to convert into cash</li>
              <li>We are not liable for user behavior, including abusive content or fraudulent activity</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of your jurisdiction. Disputes will be resolved under applicable local laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, disputes, or concerns, contact:
            </p>
            <ul className="list-none space-y-1 text-muted-foreground ml-4">
              <li><strong className="text-foreground">Email:</strong> <a href="mailto:support@cozonrq.com" className="text-primary hover:underline">support@cozonrq.com</a></li>
            </ul>
          </section>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex justify-center gap-4 mb-4">
              <Link to="/privacy-policy" className="text-sm text-primary hover:underline">
                Privacy Policy
              </Link>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              By using Cozon RQ, you acknowledge that you have read and understood these Terms & Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
