import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { auth, isFirebaseConfigured, firebaseConfigError } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserProfile } from './services/databaseService';
import { getUserXP, getLevelForXP, levelProgress } from './services/xpService';
import Registration from './components/Registration';
import HomePage from './components/HomePage';
import './App.css';

// Lazy-load heavy page components for code-splitting
const ModuleSelector = lazy(() => import('./components/ModuleSelector'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const ProfileSettings = lazy(() => import('./components/ProfileSettings'));
const ParentDashboard = lazy(() => import('./components/ParentDashboard'));

// Lightweight fallback shown while lazy chunks load
const PageSpinner = () => (
  <div className="flex items-center justify-center py-24">
    <div className="text-4xl animate-wizard-bounce">🧙</div>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [xpData, setXpData] = useState({ totalXP: 0, level: 1, dailyQuestions: 0, dailyGoal: 10 });
  const [showRegistration, setShowRegistration] = useState(false);
  const [previewCoachingMode, setPreviewCoachingMode] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      console.error('Firebase configuration error:', firebaseConfigError);
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
          // Load XP data
          const xp = await getUserXP(currentUser.uid);
          setXpData(xp);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setXpData({ totalXP: 0, level: 1, dailyQuestions: 0, dailyGoal: 10 });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentPage('home');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleRegistrationComplete = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        const xp = await getUserXP(user.uid);
        setXpData(xp);
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  }, [user]);

  // Called by QuestionCard after each answer to keep nav XP bar live
  const handleXPUpdate = useCallback((xpResult) => {
    if (xpResult) {
      setXpData(prev => ({
        ...prev,
        totalXP: xpResult.totalXP,
        level: xpResult.level,
        dailyQuestions: xpResult.dailyQuestions,
        dailyGoal: xpResult.dailyGoal,
      }));
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-wizard-bounce">🧙</div>
          <p className="text-2xl sm:text-3xl font-bold text-white">Loading Math Wizard...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user || !userProfile) {
    if (!isFirebaseConfigured) {
      if (previewCoachingMode) {
        return (
          <div className="min-h-screen bg-violet-50">
            <div className="sticky top-0 z-[60] px-4 py-3 bg-amber-100 border-b border-amber-300 flex items-center justify-between gap-3">
              <p className="text-amber-900 text-xs sm:text-sm font-semibold">
                Demo Coaching Mode: running without Firebase login.
              </p>
              <button
                onClick={() => setPreviewCoachingMode(false)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition"
              >
                Back to Home
              </button>
            </div>
            <Suspense fallback={<PageSpinner />}>
              <ModuleSelector
                userId="demo-local"
                userGrade="4-5"
                userProfile={{ name: 'Demo Learner', grade: '4-5' }}
                onXPUpdate={() => {}}
                previewMode
              />
            </Suspense>
          </div>
        );
      }

      return (
        <div className="relative">
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs sm:text-sm shadow-md">
            Preview mode: Firebase not configured
          </div>
          <HomePage onGetStarted={() => setShowRegistration(true)} />
          {showRegistration && (
            <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-amber-200">
                <h2 className="text-2xl font-bold text-amber-700 mb-3">Firebase setup required</h2>
                <p className="text-gray-700 mb-3">
                  Registration/login is disabled in preview mode because Firebase environment variables are missing.
                </p>
                <p className="text-sm text-gray-600 mb-4">{firebaseConfigError}</p>
                <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-6">
                  <li>Copy <code>.env.example</code> to <code>.env</code>.</li>
                  <li>Fill in your Firebase values in <code>.env</code>.</li>
                  <li>Restart the dev server (<code>npm start</code>).</li>
                </ol>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setShowRegistration(false);
                      setPreviewCoachingMode(true);
                    }}
                    className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold transition"
                  >
                    Start Demo Coaching
                  </button>
                  <button
                    onClick={() => setShowRegistration(false)}
                    className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (showRegistration) {
      return <Registration onRegistrationComplete={handleRegistrationComplete} />;
    }
    return <HomePage onGetStarted={() => setShowRegistration(true)} />;
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-violet-700 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-bold"
      >
        Skip to content
      </a>
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            {/* Logo - Click to go home */}
            <button
              onClick={() => { setCurrentPage('home'); setMenuOpen(false); }}
              className="flex items-center space-x-2 hover:opacity-80 transition cursor-pointer"
            >
              <span className="text-2xl sm:text-3xl">🧙</span>
              <h1 className="text-xl sm:text-2xl font-bold">Math Wizard</h1>
            </button>

            {/* User Info + XP Bar - hidden on mobile */}
            <div className="hidden md:flex flex-col items-center gap-1">
              <p className="font-semibold text-sm max-w-[200px] truncate">{userProfile?.name} • Grade {userProfile?.grade}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-amber-300">⚡ Lv.{getLevelForXP(xpData.totalXP)}</span>
                <div className="w-24 h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-500 relative"
                    style={{ width: `${Math.round(levelProgress(xpData.totalXP) * 100)}%` }}
                  >
                    <div className="absolute inset-0 xp-bar-shimmer rounded-full" />
                  </div>
                </div>
                <span className="opacity-80">{xpData.totalXP} XP</span>
              </div>
              {/* Daily Goal */}
              <div className="flex items-center gap-1 text-xs opacity-80">
                <span>📋 {Math.min(xpData.dailyQuestions, xpData.dailyGoal)}/{xpData.dailyGoal} today</span>
                {xpData.dailyQuestions >= xpData.dailyGoal && <span className="text-amber-300">✓</span>}
              </div>
            </div>

            {/* Desktop Navigation Buttons - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  currentPage === 'home'
                    ? 'bg-white text-violet-700 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <span aria-hidden="true">🎮</span> Play
              </button>
              <button
                onClick={() => setCurrentPage('analytics')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  currentPage === 'analytics'
                    ? 'bg-white text-violet-700 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <span aria-hidden="true">📊</span> Progress
              </button>
              <button
                onClick={() => setCurrentPage('settings')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  currentPage === 'settings'
                    ? 'bg-white text-violet-700 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <span aria-hidden="true">⚙️</span> Settings
              </button>
              <button
                onClick={() => setCurrentPage('parent')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  currentPage === 'parent'
                    ? 'bg-white text-violet-700 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <span aria-hidden="true">👨‍👩‍👧</span> Parent
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 transition"
              >
                🚪 Logout
              </button>
            </div>

            {/* Hamburger button - visible on mobile only */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu backdrop — closes menu on outside tap */}
          {menuOpen && (
            <div
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Menu - slides down when open */}
          {menuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-white border-opacity-30 space-y-2 animate-slide-down relative z-50">
              <div className="text-center mb-2">
                <p className="text-sm opacity-90">
                  {userProfile?.name} • Grade {userProfile?.grade}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1 text-xs">
                  <span className="font-bold text-amber-300">⚡ Lv.{getLevelForXP(xpData.totalXP)}</span>
                  <div className="w-20 h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(levelProgress(xpData.totalXP) * 100)}%` }}
                    />
                  </div>
                  <span className="opacity-80">{xpData.totalXP} XP</span>
                </div>
                <p className="text-xs opacity-70 mt-1">
                  📋 {Math.min(xpData.dailyQuestions, xpData.dailyGoal)}/{xpData.dailyGoal} questions today
                  {xpData.dailyQuestions >= xpData.dailyGoal && ' ✓'}
                </p>
              </div>
              <button
                onClick={() => { setCurrentPage('home'); setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  currentPage === 'home'
                    ? 'bg-white text-violet-700 shadow'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                🎮 Play
              </button>
              <button
                onClick={() => { setCurrentPage('analytics'); setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  currentPage === 'analytics'
                    ? 'bg-white text-violet-700 shadow'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                📊 Progress
              </button>
              <button
                onClick={() => { setCurrentPage('settings'); setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  currentPage === 'settings'
                    ? 'bg-white text-violet-700 shadow'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => { setCurrentPage('parent'); setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  currentPage === 'parent'
                    ? 'bg-white text-violet-700 shadow'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                👨‍👩‍👧 Parent
              </button>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 transition"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className={currentPage === 'home' ? '' : 'py-8'}>
        <Suspense fallback={<PageSpinner />}>
        {currentPage === 'home' && (
          <div key="home" className="animate-fade-in">
            <ModuleSelector userId={user.uid} userGrade={userProfile?.grade} userProfile={userProfile} onXPUpdate={handleXPUpdate} />
          </div>
        )}
        {currentPage === 'analytics' && (
          <div key="analytics" className="animate-fade-in">
            <AnalyticsDashboard userId={user.uid} />
          </div>
        )}
        {currentPage === 'settings' && (
          <div key="settings" className="animate-fade-in">
            <ProfileSettings 
              userId={user.uid} 
              userProfile={userProfile}
              onBack={() => setCurrentPage('home')}
              onProfileUpdated={refreshProfile}
            />
          </div>
        )}
        {currentPage === 'parent' && (
          <div key="parent" className="animate-fade-in">
            <ParentDashboard
              userId={user.uid}
              userProfile={userProfile}
              onBack={() => setCurrentPage('home')}
            />
          </div>
        )}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm opacity-75">
            © 2026 Math Wizard. Made with 💙 for curious minds.
          </p>
          <p className="text-xs opacity-50 mt-2">
            Keep your learning streak alive! 🔥
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
