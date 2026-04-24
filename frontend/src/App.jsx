import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './context/authStore';
import useDarkMode from './hooks/useDarkMode';
import { connectSocket } from './utils/socket';
import { FEATURES } from './config/features';

// Auth
import LoginScreen from './components/Auth/LoginScreen';
import RegisterScreen from './components/Auth/RegisterScreen';
import VerifyScreen from './components/Auth/VerifyScreen';

// Landing
import LandingPage from './components/Landing/LandingPage';

// Legal
import PrivacyScreen from './components/Legal/PrivacyScreen';
import ImprintScreen from './components/Legal/ImprintScreen';

// Main
import HomeScreen from './components/Home/HomeScreen';
import SwipeScreen from './components/Swipe/SwipeScreen';
import OfferScreen from './components/Table/OfferScreen';
import MatchesScreen from './components/Swipe/MatchesScreen';
import ChatScreen from './components/Chat/ChatScreen';
import ChatListScreen from './components/Chat/ChatListScreen';
import ProfileScreen from './components/Profile/ProfileScreen';
import BottomNav from './components/Shared/BottomNav';
import NotificationBanner from './components/Shared/NotificationBanner';

// Admin
import AdminPanel from './components/Admin/AdminPanel';

// Style (How's my Style?)
const HowsMyStyleScreen = FEATURES.howsMyStyle
  ? React.lazy(() => import('./components/Style/HowsMyStyleScreen'))
  : null;

// Connect (Feature-Flag)
const ConnectScreen = FEATURES.directConnect
  ? React.lazy(() => import('./components/Connect/ConnectScreen'))
  : null;

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  if (!token) return <Navigate to="/" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="max-w-md mx-auto bg-white dark:bg-dark-bg relative flex flex-col dark-transition" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const { init } = useDarkMode();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (token) connectSocket();
  }, [token]);

  return (
    <div className="bg-gray-100 dark:bg-dark-bg min-h-screen dark-transition">
      {token && <NotificationBanner />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={token ? <Navigate to="/home" replace /> : <LoginScreen />} />
        <Route path="/register" element={token ? <Navigate to="/home" replace /> : <RegisterScreen />} />
        <Route path="/verify" element={token ? <Navigate to="/home" replace /> : <VerifyScreen />} />
        <Route path="/privacy" element={<PrivacyScreen />} />
        <Route path="/imprint" element={<ImprintScreen />} />

        {/* Landing Page — only when not logged in */}
        <Route path="/" element={token ? <Navigate to="/home" replace /> : <LandingPage />} />

        {/* Protected */}
        <Route path="/home" element={
          <ProtectedRoute>
            <AppLayout><HomeScreen /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        } />
        <Route path="/discover" element={
          <ProtectedRoute>
            <AppLayout><SwipeScreen /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/offer" element={
          <ProtectedRoute>
            <AppLayout><OfferScreen /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/matches" element={
          <ProtectedRoute>
            <AppLayout><MatchesScreen /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <AppLayout><ChatListScreen /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat/:matchId" element={
          <ProtectedRoute>
            <ChatScreen />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout><ProfileScreen /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Style - How's my Style? */}
        {FEATURES.howsMyStyle && HowsMyStyleScreen && (
          <Route path="/style" element={
            <ProtectedRoute>
              <AppLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><span className="text-gray-400">Laden...</span></div>}>
                  <HowsMyStyleScreen />
                </React.Suspense>
              </AppLayout>
            </ProtectedRoute>
          } />
        )}

        {/* Connect (Feature-Flag) */}
        {FEATURES.directConnect && ConnectScreen && (
          <Route path="/connect" element={
            <ProtectedRoute>
              <AppLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><span className="text-gray-400">Laden...</span></div>}>
                  <ConnectScreen />
                </React.Suspense>
              </AppLayout>
            </ProtectedRoute>
          } />
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to={token ? "/home" : "/"} replace />} />
      </Routes>
    </div>
  );
}
