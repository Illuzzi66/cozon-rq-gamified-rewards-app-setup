
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Coins, ListTodo, Image, Video, Wallet, Crown, User, BarChart3, Trophy, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { profile } = useAuth();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/spin', icon: Coins, label: 'Spin' },
    { path: '/tasks', icon: ListTodo, label: 'Tasks' },
    { path: '/memes', icon: Image, label: 'Memes' },
    { path: '/watch-ads', icon: Video, label: 'Ads' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/analytics', icon: BarChart3, label: 'Stats' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaders' },
    { path: '/notifications', icon: Bell, label: 'Alerts' },
    { path: '/premium', icon: Crown, label: 'Premium' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-8 h-8 text-gold" />
            <span className="text-xl font-bold text-foreground">Cozon</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Coins className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{profile?.coins || 0}</span>
            </div>
            {profile?.is_premium && (
              <Crown className="w-5 h-5 text-yellow-500" />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around py-2">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}