import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserProfile } from './services/databaseService';
import Registration from './components/Registration';
import ModuleSelector from './components/ModuleSelector';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ProfileSettings from './components/ProfileSettings';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
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

  const handleRegistrationComplete = () => {
    setCurrentPage('home');
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🧙</div>
          <p className="text-2xl sm:text-3xl font-bold text-white">Loading Math Wizard...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show registration
  if (!user || !userProfile) {
    return <Registration onRegistrationComplete={handleRegistrationComplete} />;
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-50">
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

            {/* User Info - hidden on mobile */}
            <div className="hidden md:block text-center">
              <p className="text-sm opacity-90">Welcome back!</p>
              <p className="font-semibold">{userProfile?.name} • Grade {userProfile?.grade}</p>
            </div>

            {/* Desktop Navigation Buttons - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  currentPage === 'home'
                    ? 'bg-white text-violet-700 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                🎮 Play
              </button>
              <button
                onClick={() => setCurrentPage('analytics')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  currentPage === 'analytics'
                    ? 'bg-white text-violet-700 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                📊 Progress
              </button>
              <button
                onClick={() => setCurrentPage('settings')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  currentPage === 'settings'
                    ? 'bg-white text-violet-700 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-20'
                }`}
              >
                ⚙️ Settings
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

          {/* Mobile Menu - slides down when open */}
          {menuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-white border-opacity-30 space-y-2">
              <p className="text-sm text-center opacity-90 mb-2">
                {userProfile?.name} • Grade {userProfile?.grade}
              </p>
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
      <main className={currentPage === 'home' ? '' : 'py-8'}>
        {currentPage === 'home' && (
          <div key="home" className="animate-fade-in">
            <ModuleSelector userId={user.uid} userGrade={userProfile?.grade} userProfile={userProfile} />
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
