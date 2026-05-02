import React, { useEffect, Component } from 'react';

class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-red-600 text-sm">
          <p className="font-bold mb-2">Kartenfehler:</p>
          <pre className="whitespace-pre-wrap break-words">{this.state.error?.message}</pre>
          <pre className="whitespace-pre-wrap break-words text-xs text-gray-500 mt-2">{this.state.error?.stack?.slice(0,500)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
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
import TrackerPage from './modules/tracker';

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
import MapScreen from './components/Map/MapScreen';
import HeatmapScreen from './components/Map/HeatmapScreen';
import BottomNav from './components/Shared/BottomNav';
import NotificationBanner from './components/Shared/NotificationBanner';

// Admin
import AdminPanel from './components/Admin/AdminPanel';

// Style (How's my Style?)
const HowsMyStyleScreen = FEATURES.howsMyStyle
  ? React.lazy(() => import('./components/Style/HowsMyStyleScreen'))
  : null;

// Life Feed
const LifeFeedScreen = FEATURES.lifeFeed
  ? React.lazy(() => import('./components/Feed/LifeFeedScreen'))
  : null;

// About Yesterday
const YesterdayScreen = FEATURES.yesterday
  ? React.lazy(() => import('./components/Yesterday/YesterdayScreen'))
  : null;
const YesterdayChatScreen = FEATURES.yesterday
  ? React.lazy(() => import('./components/Yesterday/YesterdayChatScreen'))
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
    <div className="max-w-md mx-auto bg-white dark:bg-dark-bg dark-transition" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="pb-20">
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

        {/* Landing / Tracker */}
        <Route path="/" element={
          FEATURES.trackerActive
            ? <TrackerPage isLoggedIn={!!token} onGoToApp={() => window.location.href = '/home'} />
            : (token ? <Navigate to="/home" replace /> : <LandingPage />)
        } />

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
        <Route path="/map" element={
          <ProtectedRoute>
            <MapErrorBoundary>
              <MapScreen />
            </MapErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/heatmap" element={
          <ProtectedRoute>
            <MapErrorBoundary>
              <HeatmapScreen />
            </MapErrorBoundary>
          </ProtectedRoute>
        } />

        {/* Life Feed */}
        {FEATURES.lifeFeed && LifeFeedScreen && (
          <Route path="/feed" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-black"><span className="text-gray-400">Laden...</span></div>}>
                <LifeFeedScreen />
              </React.Suspense>
            </ProtectedRoute>
          } />
        )}

        {/* About Yesterday */}
        {FEATURES.yesterday && YesterdayScreen && (
          <Route path="/yesterday" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><span className="text-gray-400">Laden...</span></div>}>
                <YesterdayScreen />
              </React.Suspense>
            </ProtectedRoute>
          } />
        )}
        {FEATURES.yesterday && YesterdayChatScreen && (
          <Route path="/yesterday/chat/:chatId" element={
            <ProtectedRoute>
              <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><span className="text-gray-400">Laden...</span></div>}>
                <YesterdayChatScreen />
              </React.Suspense>
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
