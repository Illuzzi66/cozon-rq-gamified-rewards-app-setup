### Requirements
Cozon RQ is a gamified rewards app where users earn coins through various activities:
- Complete tasks (Simple, Medium, Weekly)
- Spin a daily wheel for rewards
- Interact with memes (like/comment)
- Watch video ads
- Withdraw earnings via Paystack ($5 minimum)
- Upgrade to Premium ($2) for 2.5× earnings and instant withdrawals

### Designs
- Clean, gamified UI with purple/blue/green color scheme
- Gold coin animations and confetti effects
- Premium badge with glow effects
- Mobile-first responsive design

### Tasks
- [x] Database setup and authentication
- [x] Spin Wheel with daily limits and rewards
- [x] Tasks system (Simple/Medium/Weekly)
- [x] Meme Feed with interactions
- [x] Video ads integration
- [x] Wallet and withdrawals
- [x] Premium upgrade system
- [ ] Enhanced spin wheel system
  - [x] Update database schema for spins_available and new reward types
  - [x] Modify wheel segments with monetary rewards ($0.50, $2) and loss outcomes
  - [x] Create spin history display component
  - [x] Update spin logic to handle spins as currency and mixed reward types
  - [x] Add visual indicators for different reward types
  - [x] Add ways to earn spins (watch ads, complete tasks, daily bonuses)
  - [x] Remove possible rewards section from spin wheel page
