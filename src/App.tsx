
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SignUp } from '@/pages/SignUp';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { SpinWheel } from '@/pages/SpinWheel';
import { Tasks } from '@/pages/Tasks';
import { MemeFeed } from '@/pages/MemeFeed';
import { WatchAds } from '@/pages/WatchAds';
import { WatchAdsSpins } from '@/pages/WatchAdsSpins';
import { Wallet } from '@/pages/Wallet';
import { Premium } from '@/pages/Premium';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/spin"
            element={
              <ProtectedRoute>
                <SpinWheel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/memes"
            element={
              <ProtectedRoute>
                <MemeFeed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watch-ads"
            element={
              <ProtectedRoute>
                <WatchAds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watch-ads-spins"
            element={
              <ProtectedRoute>
                <WatchAdsSpins />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/premium"
            element={
              <ProtectedRoute>
                <Premium />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;