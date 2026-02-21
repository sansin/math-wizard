import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, sendPasswordResetEmail } from 'firebase/auth';
import { saveUserProfile } from '../services/databaseService';

export default function Registration({ onRegistrationComplete }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    age: '',
    grade: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useGuest, setUseGuest] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const friendlyError = (code) => {
    const messages = {
      'auth/email-already-in-use': 'This email already has an account. Try logging in instead!',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/user-not-found': 'No account found with this email. Try registering instead!',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Incorrect email or password. Please try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    };
    return messages[code] || null;
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetSent(false);
    if (!form.email) {
      setError('Please enter your email address first, then click Forgot Password.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, form.email);
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err.code) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setResetSent(false);
    setLoading(true);

    try {
      if (!form.email || !form.password) {
        throw new Error('Please enter your email and password');
      }
      await signInWithEmailAndPassword(auth, form.email, form.password);
      onRegistrationComplete();
    } catch (err) {
      setError(friendlyError(err.code) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!form.name || !form.age || !form.grade) {
        throw new Error('Please fill in all required fields');
      }
      if (form.email && form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (form.password && form.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      let userCred;
      if (form.email && form.password) {
        userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      } else {
        userCred = await signInAnonymously(auth);
      }

      // Save user profile
      await saveUserProfile(userCred.user.uid, {
        name: form.name,
        age: parseInt(form.age),
        grade: parseInt(form.grade),
        email: form.email || 'guest@mathwizard.local',
        isGuest: !form.email,
      });

      onRegistrationComplete();
    } catch (err) {
      const friendly = friendlyError(err.code);
      if (err.code === 'auth/email-already-in-use') {
        setError(friendly);
        setIsLoginMode(true);
      } else {
        setError(friendly || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-300 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-pink-600 mb-2">
            🧙 Math Wizard
          </h1>
          <p className="text-gray-600 text-sm">Learn math the fun way with AI!</p>

          {/* Toggle between Login and Register */}
          <div className="flex justify-center mt-4 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setIsLoginMode(false); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition ${!isLoginMode ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setIsLoginMode(true); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition ${isLoginMode ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Login
            </button>
          </div>
        </div>

        {/* LOGIN FORM */}
        {isLoginMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                required
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {resetSent && (
              <div className="p-3 bg-green-100 border-l-4 border-green-500 text-green-700 text-sm rounded">
                ✅ Password reset email sent! Check your inbox (and spam folder).
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : '🔑 Log In'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <button type="button" onClick={() => { setIsLoginMode(false); setError(''); setResetSent(false); }} className="text-blue-600 font-semibold hover:underline">
                Register here
              </button>
            </p>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                required
              />
            </div>

            {/* Age */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  placeholder="Age"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                  min="4"
                  max="18"
                  required
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Grade</label>
                <select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                  required
                >
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email (Optional) */}
            {!useGuest && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email (Optional - for saving progress)
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                  />
                </div>

                {/* Password */}
                {form.email && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="At least 6 characters"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                        required
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : '🚀 Start Learning!'}
              </button>

              {!useGuest && form.email && (
                <button
                  type="button"
                  onClick={() => setUseGuest(true)}
                  className="w-full bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Or Play as Guest
                </button>
              )}
            </div>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button type="button" onClick={() => { setIsLoginMode(true); setError(''); }} className="text-blue-600 font-semibold hover:underline">
                Log in here
              </button>
            </p>
          </form>
        )}

        {/* Guest Mode Info */}
        {useGuest && !isLoginMode && (
          <p className="text-center text-sm text-gray-600 mt-4">
            ⚠️ Guest mode: Progress won't be saved across devices
          </p>
        )}
      </div>
    </div>
  );
}
