import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { getUserStats, getUserAnswerHistory } from '../services/databaseService';
import { getUserXP, getLevelForXP, levelProgress, getLevelTitle, xpToNextLevel } from '../services/xpService';

export default function AnalyticsDashboard({ userId }) {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    accuracy: 0,
    streak: 0,
    weakAreas: [],
    sessionData: [],
  });
  const [dailyAccuracy, setDailyAccuracy] = useState({ labels: [], data: [] });
  const [xpData, setXpData] = useState({ totalXP: 0, level: 1, dailyQuestions: 0, dailyGoal: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [statsData, history, xp] = await Promise.all([
        getUserStats(userId),
        getUserAnswerHistory(userId),
        getUserXP(userId),
      ]);
      setStats(statsData);
      setXpData(xp);

      // Compute daily accuracy from real answer history
      if (history && history.length > 0) {
        const byDay = {};
        history.forEach(a => {
          // Handle Firestore Timestamp or Date
          let date;
          if (a.timestamp?.toDate) {
            date = a.timestamp.toDate();
          } else if (a.timestamp) {
            date = new Date(a.timestamp);
          } else {
            date = new Date();
          }
          const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!byDay[key]) byDay[key] = { correct: 0, total: 0, ts: date };
          byDay[key].total++;
          if (a.correct) byDay[key].correct++;
        });

        // Sort by date and take last 7 days
        const sorted = Object.entries(byDay)
          .sort(([, a], [, b]) => a.ts - b.ts)
          .slice(-7);

        setDailyAccuracy({
          labels: sorted.map(([label]) => label),
          data: sorted.map(([, d]) => Math.round((d.correct / d.total) * 100)),
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-violet-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Skeleton: Header */}
          <div className="text-center mb-8">
            <div className="skeleton h-9 w-56 mx-auto mb-3 rounded" />
            <div className="skeleton h-5 w-40 mx-auto rounded" />
          </div>
          {/* Skeleton: Level & Daily Goal */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-lg">
              <div className="skeleton h-5 w-20 mb-2 rounded" />
              <div className="skeleton h-7 w-32 mb-3 rounded" />
              <div className="skeleton h-3 w-full rounded-full" />
            </div>
            <div className="bg-white rounded-xl p-5 shadow-lg">
              <div className="skeleton h-5 w-24 mb-2 rounded" />
              <div className="skeleton h-7 w-36 mb-3 rounded" />
              <div className="skeleton h-3 w-full rounded-full" />
            </div>
          </div>
          {/* Skeleton: KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-lg">
                <div className="skeleton h-4 w-24 mb-3 rounded" />
                <div className="skeleton h-10 w-16 mb-2 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
            ))}
          </div>
          {/* Skeleton: Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="skeleton h-6 w-36 mb-4 rounded" />
              <div className="skeleton h-80 w-full rounded" />
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="skeleton h-6 w-36 mb-4 rounded" />
              <div className="skeleton h-80 w-full rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chart data - Accuracy trend (real data)
  const hasChartData = dailyAccuracy.labels.length > 0;
  const accuracyChartData = {
    labels: hasChartData ? dailyAccuracy.labels : ['No data yet'],
    datasets: [{
      label: 'Accuracy (%)',
      data: hasChartData ? dailyAccuracy.data : [0],
      borderColor: '#7C3AED',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 6,
      pointBackgroundColor: '#7C3AED',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  };

  // Chart data - Weak areas
  const weakAreaChartData = {
    labels: stats.weakAreas.map(a => a.name.charAt(0).toUpperCase() + a.name.slice(1)),
    datasets: [{
      label: 'Accuracy by Topic (%)',
      data: stats.weakAreas.map(a => a.accuracy),
      backgroundColor: [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
      ],
      borderColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
      ],
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          font: { size: 12, weight: 'bold' },
          padding: 15,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          font: { size: 11 },
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-violet-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">📊 Your Progress</h1>
          <p className="text-gray-600">Keep learning and improving! 🚀</p>
        </div>

        {/* Level & Daily Goal Banner */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {/* Level Card */}
          <div className="bg-white rounded-xl p-5 shadow-lg border-2 border-violet-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">Level {getLevelForXP(xpData.totalXP)}</p>
                <p className="text-xl font-bold text-violet-600">{getLevelTitle(getLevelForXP(xpData.totalXP))}</p>
              </div>
              <div className="text-3xl">
                {getLevelForXP(xpData.totalXP) >= 8 ? '🏆' : getLevelForXP(xpData.totalXP) >= 5 ? '⭐' : '🌱'}
              </div>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-purple-600 rounded-full transition-all duration-700 relative"
                style={{ width: `${Math.round(levelProgress(xpData.totalXP) * 100)}%` }}
              >
                <div className="absolute inset-0 xp-bar-shimmer rounded-full" />
              </div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>⚡ {xpData.totalXP} XP</span>
              <span>{xpToNextLevel(xpData.totalXP) > 0 ? `${xpToNextLevel(xpData.totalXP)} XP to next level` : 'Max level!'}</span>
            </div>
          </div>

          {/* Daily Goal Card */}
          <div className="bg-white rounded-xl p-5 shadow-lg border-2 border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">Daily Goal</p>
                <p className="text-xl font-bold text-amber-600">
                  {Math.min(xpData.dailyQuestions, xpData.dailyGoal)}/{xpData.dailyGoal} questions
                </p>
              </div>
              <div className="text-3xl">
                {xpData.dailyQuestions >= xpData.dailyGoal ? '🎯' : '📋'}
              </div>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((xpData.dailyQuestions / xpData.dailyGoal) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{xpData.dailyQuestions >= xpData.dailyGoal ? '✅ Goal complete!' : `${xpData.dailyGoal - xpData.dailyQuestions} more to go`}</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Questions */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-amber-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Total Questions</p>
            <p className="text-3xl sm:text-4xl font-bold text-amber-500">{stats.totalQuestions}</p>
            <p className="text-xs text-gray-500 mt-2">questions answered</p>
          </div>

          {/* Accuracy */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-emerald-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Accuracy</p>
            <p className="text-3xl sm:text-4xl font-bold text-emerald-500">{stats.accuracy}%</p>
            <p className="text-xs text-gray-500 mt-2">overall score</p>
          </div>

          {/* Current Streak */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-violet-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Current Streak 🔥</p>
            <p className="text-3xl sm:text-4xl font-bold text-violet-500">{stats.streak}</p>
            <p className="text-xs text-gray-500 mt-2">correct in a row</p>
          </div>

          {/* Topics */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-purple-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Topics</p>
            <p className="text-3xl sm:text-4xl font-bold text-purple-500">{stats.weakAreas.length}</p>
            <p className="text-xs text-gray-500 mt-2">types practiced</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Accuracy Trend */}
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📈 Accuracy Trend</h3>
            <div className="relative h-80">
              <Line data={accuracyChartData} options={chartOptions} />
            </div>
          </div>

          {/* Weak Areas */}
          {stats.weakAreas.length > 0 ? (
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Accuracy by Topic</h3>
              <div className="relative h-80">
                <Bar data={weakAreaChartData} options={chartOptions} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-lg font-bold text-gray-700 mb-1">No topic data yet!</p>
              <p className="text-sm text-gray-500">Answer some questions and your charts will appear here.</p>
            </div>
          )}
        </div>

        {/* Focus Areas */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">💪 Focus Areas</h3>
          {stats.weakAreas.length > 0 ? (
            <ul className="space-y-3">
              {stats.weakAreas.map((area, i) => {
                let color = 'bg-red-100';
                let textColor = 'text-red-700';
                let badgeColor = 'bg-red-500';

                if (area.accuracy >= 70) {
                  color = 'bg-green-100';
                  textColor = 'text-green-700';
                  badgeColor = 'bg-green-500';
                } else if (area.accuracy >= 50) {
                  color = 'bg-yellow-100';
                  textColor = 'text-yellow-700';
                  badgeColor = 'bg-yellow-500';
                }

                return (
                  <div
                    key={i}
                    className={`flex justify-between items-center p-4 ${color} rounded-lg border-l-4 ${
                      area.accuracy >= 70 ? 'border-green-500' : area.accuracy >= 50 ? 'border-yellow-500' : 'border-red-500'
                    }`}
                  >
                    <div>
                      <span className={`font-semibold ${textColor} block capitalize text-lg`}>
                        {area.name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {area.total} questions
                      </span>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-white text-lg font-bold ${badgeColor}`}>
                      {area.accuracy}%
                    </span>
                  </div>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🧙</div>
              <p className="text-lg font-bold text-gray-700 mb-1">No progress data yet!</p>
              <p className="text-sm text-gray-500">Start practicing and your focus areas will show up here.</p>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">💡 Tips for Success</h3>
          <ul className="grid md:grid-cols-2 gap-4 text-gray-700">
            <li className="flex items-start">
              <span className="text-2xl mr-3">🎯</span>
              <span>Focus on weak areas to improve faster</span>
            </li>
            <li className="flex items-start">
              <span className="text-2xl mr-3">🔥</span>
              <span>Build streaks by answering correctly in a row</span>
            </li>
            <li className="flex items-start">
              <span className="text-2xl mr-3">📚</span>
              <span>Practice different operation types regularly</span>
            </li>
            <li className="flex items-start">
              <span className="text-2xl mr-3">⏰</span>
              <span>Challenge yourself with timed tests</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
