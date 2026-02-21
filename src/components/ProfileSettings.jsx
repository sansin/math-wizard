import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { updateDoc, doc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function ProfileSettings({ userId, userProfile, onBack, onProfileUpdated }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: userProfile?.name || '',
    age: userProfile?.age || '',
    grade: userProfile?.grade || '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Update Firestore user document
      await updateDoc(doc(db, 'users', userId), {
        name: form.name,
        age: parseInt(form.age),
        grade: parseInt(form.grade),
        updatedAt: new Date(),
      });

      // Update password if provided
      if (newPassword && newPassword === confirmPassword) {
        await updatePassword(auth.currentUser, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      } else if (newPassword || confirmPassword) {
        setMessage('❌ Passwords do not match');
        setLoading(false);
        return;
      }

      setMessage('✅ Profile updated successfully!');
      setEditMode(false);
      if (onProfileUpdated) await onProfileUpdated();
      // Navigate back after a short delay so user sees the success message
      const timer = setTimeout(() => {
        onBack();
      }, 1500);
      // Return cleanup in case component unmounts before timeout fires
      return () => clearTimeout(timer);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-blue-200 to-pink-200 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-blue-700">⚙️ Settings</h1>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            ← Back
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">👤 My Profile</h2>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                editMode
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {editMode ? 'Cancel' : '✏️ Edit'}
            </button>
          </div>

          {!editMode ? (
            // Display Mode
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Name:</span>
                <span className="text-xl text-blue-600">{form.name}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Age:</span>
                <span className="text-xl text-blue-600">{form.age} years</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Grade:</span>
                <span className="text-xl text-blue-600">Grade {form.grade}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Email:</span>
                <span className="text-sm text-gray-600">{userProfile?.email}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Account Type:</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-blue-200 text-blue-800">
                  {userProfile?.isGuest ? 'Guest' : 'Premium'}
                </span>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600"
                    min="4"
                    max="18"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Grade
                  </label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600"
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Section */}
              {!userProfile?.isGuest && (
                <>
                  <div className="pt-4 border-t-2 border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3">🔐 Change Password (Optional)</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </>
              )}

              {message && (
                <div className={`p-3 rounded-lg text-sm font-semibold ${
                  message.includes('✅')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </form>
          )}
        </div>

        {/* Settings Info */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
          <h3 className="font-bold text-blue-800 mb-3">💡 Settings Tips</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>✅ Update your age/grade to get better recommendations</li>
            <li>✅ Change your name anytime</li>
            <li>✅ Password changes are secure and encrypted</li>
            <li>✅ Your progress is always saved to the cloud</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
