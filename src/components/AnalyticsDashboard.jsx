import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { getUserStats, getUserAnswerHistory } from '../services/databaseService';

export default function AnalyticsDashboard({ userId }) {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    accuracy: 0,
    streak: 0,
    weakAreas: [],
    sessionData: [],
  });
  const [dailyAccuracy, setDailyAccuracy] = useState({ labels: [], data: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [statsData, history] = await Promise.all([
        getUserStats(userId),
        getUserAnswerHistory(userId),
      ]);
      setStats(statsData);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
        <p className="text-3xl font-bold text-blue-600">Loading your progress... 📊</p>
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
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 6,
      pointBackgroundColor: '#FFD700',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-blue-700 mb-2">📊 Your Progress</h1>
          <p className="text-gray-600">Keep learning and improving! 🚀</p>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {/* Total Questions */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-yellow-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Total Questions</p>
            <p className="text-4xl font-bold text-yellow-500">{stats.totalQuestions}</p>
            <p className="text-xs text-gray-500 mt-2">questions answered</p>
          </div>

          {/* Accuracy */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-green-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Accuracy</p>
            <p className="text-4xl font-bold text-green-500">{stats.accuracy}%</p>
            <p className="text-xs text-gray-500 mt-2">overall score</p>
          </div>

          {/* Current Streak */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-blue-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Current Streak 🔥</p>
            <p className="text-4xl font-bold text-blue-500">{stats.streak}</p>
            <p className="text-xs text-gray-500 mt-2">correct in a row</p>
          </div>

          {/* Topics */}
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-purple-400">
            <p className="text-gray-600 text-sm font-semibold mb-2">Topics</p>
            <p className="text-4xl font-bold text-purple-500">{stats.weakAreas.length}</p>
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
            <div className="bg-white rounded-lg p-6 shadow-lg flex items-center justify-center">
              <p className="text-gray-500 text-center">
                Start solving questions to see your topic breakdown!
              </p>
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
            <p className="text-gray-500 text-center py-6">
              No data yet. Start playing to see your progress!
            </p>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-6 mt-8">
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
