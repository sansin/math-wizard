import React, { useState, useEffect, useCallback } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { getUserStats, getUserAnswerHistory } from '../services/databaseService';
import { getUserXP, getLevelForXP, getLevelTitle, levelProgress, xpToNextLevel } from '../services/xpService';

/**
 * ParentDashboard — A dedicated, read-only overview for parents / guardians.
 *
 * Shows:
 *  1. Child summary card (name, grade, level, total XP)
 *  2. Weekly progress report (questions per day, accuracy trend)
 *  3. Time-spent estimation (based on answer count × average pace)
 *  4. Topic mastery breakdown (doughnut chart)
 *  5. Strengths & areas for improvement
 *  6. Recent activity feed (last 20 answers)
 */

const ESTIMATED_SECONDS_PER_QUESTION = 45; // average time per question for estimation

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ParentDashboard({ userId, userProfile, onBack }) {
  const [stats, setStats] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, history, xp] = await Promise.all([
        getUserStats(userId),
        getUserAnswerHistory(userId),
        getUserXP(userId),
      ]);

      setStats(statsData);
      setXpData(xp);

      // --- Weekly data (last 7 days) ---
      const today = new Date();
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        last7.push(d.toISOString().slice(0, 10));
      }

      const dayBuckets = {};
      last7.forEach(d => { dayBuckets[d] = { correct: 0, total: 0 }; });

      if (history && history.length > 0) {
        history.forEach(a => {
          let date;
          if (a.timestamp?.toDate) date = a.timestamp.toDate();
          else if (a.timestamp) date = new Date(a.timestamp);
          else return;
          const key = date.toISOString().slice(0, 10);
          if (dayBuckets[key]) {
            dayBuckets[key].total++;
            if (a.correct) dayBuckets[key].correct++;
          }
        });

        // Recent activity — last 20
        const recent = history.slice(-20).reverse().map(a => {
          let date;
          if (a.timestamp?.toDate) date = a.timestamp.toDate();
          else if (a.timestamp) date = new Date(a.timestamp);
          else date = new Date();
          return {
            question: a.question || 'Question',
            operation: a.operation || 'general',
            correct: !!a.correct,
            date,
          };
        });
        setRecentActivity(recent);
      }

      setWeeklyData({
        labels: last7.map(d => {
          const dt = new Date(d + 'T12:00:00');
          return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }),
        questions: last7.map(d => dayBuckets[d].total),
        accuracy: last7.map(d => dayBuckets[d].total > 0 ? Math.round((dayBuckets[d].correct / dayBuckets[d].total) * 100) : null),
      });
    } catch (error) {
      console.error('Error loading parent dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="skeleton h-9 w-64 mx-auto mb-4 rounded" />
          <div className="skeleton h-5 w-48 mx-auto mb-8 rounded" />
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="skeleton h-5 w-24 mb-3 rounded" />
                <div className="skeleton h-8 w-20 mb-2 rounded" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="skeleton h-6 w-40 mb-4 rounded" />
                <div className="skeleton h-56 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const level = getLevelForXP(xpData?.totalXP || 0);
  const totalTimeEstimate = (stats?.totalQuestions || 0) * ESTIMATED_SECONDS_PER_QUESTION;
  const weeklyQuestions = weeklyData ? weeklyData.questions.reduce((a, b) => a + b, 0) : 0;
  const weeklyTimeEstimate = weeklyQuestions * ESTIMATED_SECONDS_PER_QUESTION;

  // --- Topic mastery doughnut ---
  const topicColors = [
    '#7C3AED', '#F59E0B', '#10B981', '#EF4444', '#3B82F6',
    '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#6366F1',
  ];
  const hasTopic = stats?.weakAreas?.length > 0;
  const doughnutData = {
    labels: hasTopic ? stats.weakAreas.map(a => a.name.charAt(0).toUpperCase() + a.name.slice(1)) : ['No data'],
    datasets: [{
      data: hasTopic ? stats.weakAreas.map(a => a.total) : [1],
      backgroundColor: hasTopic ? topicColors.slice(0, stats.weakAreas.length) : ['#E5E7EB'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  // --- Weekly questions line chart ---
  const weeklyChartData = weeklyData ? {
    labels: weeklyData.labels,
    datasets: [
      {
        label: 'Questions',
        data: weeklyData.questions,
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: '#7C3AED',
        yAxisID: 'y',
      },
      {
        label: 'Accuracy %',
        data: weeklyData.accuracy,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        tension: 0.4,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: '#10B981',
        borderDash: [5, 5],
        yAxisID: 'y1',
        spanGaps: true,
      },
    ],
  } : null;

  // Strengths & weaknesses
  const strengths = (stats?.weakAreas || []).filter(a => a.accuracy >= 70).sort((a, b) => b.accuracy - a.accuracy);
  const improvements = (stats?.weakAreas || []).filter(a => a.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">👨‍👩‍👧 Parent Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Progress report for <span className="font-semibold text-violet-600">{userProfile?.name}</span></p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2 min-h-[44px] bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
          >
            ← Back
          </button>
        </div>

        {/* Child Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Level */}
          <div className="bg-white rounded-xl p-5 shadow-lg border-t-4 border-violet-500">
            <p className="text-sm font-semibold text-gray-500 mb-1">Level</p>
            <p className="text-2xl font-bold text-violet-600">Lv. {level}</p>
            <p className="text-xs text-gray-500 mt-1">{getLevelTitle(level)}</p>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-purple-600 rounded-full transition-all"
                style={{ width: `${Math.round(levelProgress(xpData?.totalXP || 0) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{xpData?.totalXP || 0} XP total • {xpToNextLevel(xpData?.totalXP || 0)} to next</p>
          </div>

          {/* Weekly Activity */}
          <div className="bg-white rounded-xl p-5 shadow-lg border-t-4 border-amber-500">
            <p className="text-sm font-semibold text-gray-500 mb-1">This Week</p>
            <p className="text-2xl font-bold text-amber-600">{weeklyQuestions}</p>
            <p className="text-xs text-gray-500 mt-1">questions answered</p>
            <p className="text-xs text-gray-400 mt-2">⏱️ ~{formatDuration(weeklyTimeEstimate)} estimated</p>
          </div>

          {/* Overall Accuracy */}
          <div className="bg-white rounded-xl p-5 shadow-lg border-t-4 border-emerald-500">
            <p className="text-sm font-semibold text-gray-500 mb-1">Accuracy</p>
            <p className="text-2xl font-bold text-emerald-600">{stats?.accuracy || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">overall score</p>
            <p className="text-xs text-gray-400 mt-2">{stats?.totalQuestions || 0} total questions</p>
          </div>

          {/* Time Spent */}
          <div className="bg-white rounded-xl p-5 shadow-lg border-t-4 border-blue-500">
            <p className="text-sm font-semibold text-gray-500 mb-1">Total Time</p>
            <p className="text-2xl font-bold text-blue-600">{formatDuration(totalTimeEstimate)}</p>
            <p className="text-xs text-gray-500 mt-1">estimated practice time</p>
            <p className="text-xs text-gray-400 mt-2">Grade {userProfile?.grade} • Age {userProfile?.age}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Weekly Trend */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Weekly Activity</h3>
            {weeklyChartData ? (
              <div className="relative h-64">
                <Line
                  data={weeklyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: { display: true, labels: { font: { size: 11 }, padding: 10 } },
                    },
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: 'Questions' }, ticks: { font: { size: 10 } } },
                      y1: { beginAtZero: true, max: 100, position: 'right', title: { display: true, text: 'Accuracy %' }, ticks: { font: { size: 10 } }, grid: { drawOnChartArea: false } },
                      x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>
            )}
          </div>

          {/* Topic Mastery */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Topic Distribution</h3>
            <div className="relative h-64 flex items-center justify-center">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8, boxWidth: 12 } },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💪 Strengths</h3>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-green-700 capitalize">{s.name}</span>
                    <span className="text-sm font-bold text-green-600 bg-green-200 px-3 py-1 rounded-full">{s.accuracy}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">Keep practicing to build strengths!</p>
            )}
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Areas for Improvement</h3>
            {improvements.length > 0 ? (
              <ul className="space-y-2">
                {improvements.map((s, i) => (
                  <li key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div>
                      <span className="font-semibold text-amber-700 capitalize block">{s.name}</span>
                      <span className="text-xs text-gray-500">{s.total} questions attempted</span>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      s.accuracy < 50 ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-200'
                    }`}>{s.accuracy}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">Great job — all topics above 70%!</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🕐 Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentActivity.map((a, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                  a.correct ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-medium text-gray-800 truncate">{a.question}</p>
                    <p className="text-xs text-gray-500 capitalize">{a.operation} • {a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-bold ${
                    a.correct ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                  }`}>
                    {a.correct ? '✓ Correct' : '✗ Wrong'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No activity yet — start practicing!</p>
          )}
        </div>

        {/* Parent Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-l-4 border-blue-500">
          <h3 className="font-bold text-blue-800 mb-3">💡 Tips for Parents</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>📊 Check this dashboard weekly to monitor learning progress</li>
            <li>🎯 Encourage practice on topics with accuracy below 70%</li>
            <li>🔥 Celebrate streaks and level-ups to keep motivation high</li>
            <li>⏰ Aim for at least 10 questions per day for steady improvement</li>
            <li>🧪 Use Test mode periodically to track progress on specific topics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
