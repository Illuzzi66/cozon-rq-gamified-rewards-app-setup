import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PrivacyPolicy: React.FC = () => {
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Cozon RQ (Reward Quest)</p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Effective Date:</strong> February 17, 2026</p>
            <p><strong className="text-foreground">Last Updated:</strong> February 17, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reward Quest ("App", "we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, store, and share your personal information when you use our app.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By using Reward Quest, you agree to this Privacy Policy. If you do not agree, please do not use the app.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect the following types of information:
            </p>

            <div className="space-y-4 ml-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">A. Account Information</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Email address</li>
                  <li>Username / display name</li>
                  <li>Optional profile picture</li>
                  <li>Payment information (for Premium unlocks)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">B. Activity & Rewards Data</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Tasks completed</li>
                  <li>Videos watched</li>
                  <li>Coins earned</li>
                  <li>Meme posts, reactions, and comments</li>
                  <li>Referral activity</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">C. Device & Usage Information</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Device type and model</li>
                  <li>Operating system version</li>
                  <li>IP address</li>
                  <li>App usage statistics</li>
                  <li>Crash reports</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">D. Advertising Data</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Ad interactions (rewarded videos, interstitial ads)</li>
                  <li>Ad engagement metrics for analytics and monetization</li>
                  <li>Google AdMob data collected automatically</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the collected information to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Provide and improve app features</li>
              <li>Track coins, rewards, and Premium access</li>
              <li>Process payments for Premium unlocks</li>
              <li>Show ads and measure ad performance</li>
              <li>Moderate user-generated content (memes, comments)</li>
              <li>Prevent fraud and abuse</li>
              <li>Communicate important updates or account issues</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. How We Share Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell or rent your personal information. We may share information with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Payment processors (e.g., Google Play Billing, Paystack) to process payments</li>
              <li>Ad networks (e.g., Google AdMob) to display ads</li>
              <li>Service providers who help us maintain or improve the app</li>
              <li>Law enforcement or regulators if required by law</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. User-Generated Content</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>All memes, comments, and reactions are user-generated content</li>
              <li>Your posts may be visible to other users</li>
              <li>We may remove content that violates our Terms & Conditions</li>
              <li>Coins earned from user interactions are tracked and may be reversed in case of abuse</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Ads and Monetization</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Rewarded video ads grant coins to users as defined in-app</li>
              <li>Interstitial or banner ads generate revenue for the app owner</li>
              <li>Ads are provided by Google AdMob, which may collect device identifiers for personalized ads</li>
              <li>You may see ads periodically while using the app (e.g., every 5 minutes, or before posting a meme)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Payments & Premium Unlocks</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Premium access costs $2 and grants enhanced earning features</li>
              <li>Payment information is processed securely by Google Play Billing (or Paystack if integrated)</li>
              <li>We do not store full credit card details</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Security</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>We implement reasonable technical and organizational measures to protect your data</li>
              <li>No system is completely secure, so we cannot guarantee absolute security</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Data Retention</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Account and usage data are retained as long as the account is active</li>
              <li>Coins, tasks, and content are retained until deletion or inactivity</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Children's Privacy</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Reward Quest is not intended for children under 13</li>
              <li>We do not knowingly collect personal information from children under 13</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">11. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise these rights, contact us at <a href="mailto:support@cozonrq.com" className="text-primary hover:underline">support@cozonrq.com</a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">12. Changes to This Policy</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>We may update this Privacy Policy at any time</li>
              <li>Users will be notified via the app or email</li>
              <li>Continued use of the app after updates constitutes acceptance</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions or concerns about this Privacy Policy:
            </p>
            <ul className="list-none space-y-1 text-muted-foreground ml-4">
              <li><strong className="text-foreground">Email:</strong> <a href="mailto:support@cozonrq.com" className="text-primary hover:underline">support@cozonrq.com</a></li>
            </ul>
          </section>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              By using Cozon RQ, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
