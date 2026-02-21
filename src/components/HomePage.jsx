import React, { useState } from 'react';

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-Powered Questions',
    desc: 'Our AI generates fresh, grade-appropriate math questions tailored to your skill level — no two sessions are the same.',
  },
  {
    icon: '📊',
    title: 'Adaptive Difficulty',
    desc: 'Questions get harder as you improve and easier when you need practice, keeping you in the perfect learning zone.',
  },
  {
    icon: '⚡',
    title: 'XP & Levels',
    desc: 'Earn experience points for every correct answer. Build streaks, level up from Number Newbie to Math Wizard Master!',
  },
  {
    icon: '📚',
    title: '20+ Math Modules',
    desc: 'From Addition to Calculus — pick your grade (KG through 9+) and choose the topics you want to practice.',
  },
  {
    icon: '⚔️',
    title: 'Challenge Mode',
    desc: 'Create a challenge and share the code with a friend. Both answer the same questions — fastest and most accurate wins!',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Parent Dashboard',
    desc: 'Parents can track weekly activity, accuracy trends, strengths, and areas for improvement — all in one place.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', icon: '✏️', title: 'Sign Up', desc: 'Create a free account with your name, age, and grade level.' },
  { step: '2', icon: '📚', title: 'Pick Your Modules', desc: 'Choose a grade and select the math topics you want to practice.' },
  { step: '3', icon: '🎮', title: 'Start Learning', desc: 'Answer AI-generated questions in Play mode, Test mode, or Challenge a friend.' },
  { step: '4', icon: '📈', title: 'Track Progress', desc: 'Watch your XP grow, level up, and review detailed analytics on your dashboard.' },
];

export default function HomePage({ onGetStarted }) {
  const [showLearnMore, setShowLearnMore] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white overflow-x-hidden">
      {/* ─── Hero Section ──────────────────────────────────────────── */}
      <section className="relative px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
        {/* Floating decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
          <span className="absolute text-5xl opacity-20 top-10 left-[10%] animate-bounce" style={{ animationDelay: '0s' }}>➕</span>
          <span className="absolute text-4xl opacity-20 top-20 right-[12%] animate-bounce" style={{ animationDelay: '0.5s' }}>✖️</span>
          <span className="absolute text-5xl opacity-20 bottom-16 left-[20%] animate-bounce" style={{ animationDelay: '1s' }}>➗</span>
          <span className="absolute text-4xl opacity-20 bottom-24 right-[18%] animate-bounce" style={{ animationDelay: '1.5s' }}>➖</span>
          <span className="absolute text-3xl opacity-15 top-32 left-[45%] animate-pulse">📐</span>
          <span className="absolute text-3xl opacity-15 bottom-10 right-[40%] animate-pulse" style={{ animationDelay: '0.8s' }}>🔢</span>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="text-7xl sm:text-8xl mb-6 animate-wizard-bounce">🧙</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
            Math Wizard
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-white/80 mb-3 max-w-xl mx-auto">
            The AI-powered math learning app that makes practice fun for kids of every grade.
          </p>
          <p className="text-sm sm:text-base text-white/60 mb-10 max-w-md mx-auto">
            Adaptive questions · XP &amp; Levels · Multiplayer Challenges · Parent Analytics
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-white text-violet-700 font-bold text-lg rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              🚀 Get Started — It's Free
            </button>
            <button
              onClick={() => setShowLearnMore(true)}
              className="px-8 py-4 border-2 border-white/50 text-white font-bold text-lg rounded-full hover:bg-white/10 transition-all duration-200"
            >
              📖 Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────────────────────── */}
      <section className="px-4 py-16 bg-white/5 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Everything Your Child Needs to Love Math
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────── */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center text-3xl">
                  {s.icon}
                </div>
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Step {s.step}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{s.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 text-white/30 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─────────────────────────────────────────────── */}
      <section className="px-4 py-12 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold">6</p>
            <p className="text-sm text-white/60">Grade Levels</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold">20+</p>
            <p className="text-sm text-white/60">Math Modules</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold">10</p>
            <p className="text-sm text-white/60">XP Levels</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold">∞</p>
            <p className="text-sm text-white/60">AI Questions</p>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="px-4 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to Start the Adventure?
          </h2>
          <p className="text-white/70 mb-8">
            Join Math Wizard today and turn math practice into an exciting quest.
            No credit card needed — just curiosity!
          </p>
          <button
            onClick={onGetStarted}
            className="px-10 py-4 bg-white text-violet-700 font-bold text-lg rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            🚀 Get Started Now
          </button>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="px-4 py-8 border-t border-white/10 text-center text-sm text-white/40">
        <p>© 2026 Math Wizard. Made with 💙 for curious minds.</p>
      </footer>

      {/* ─── Learn More Modal ──────────────────────────────────────── */}
      {showLearnMore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white text-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 animate-slide-in"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-violet-700">📖 How Math Wizard Works</h2>
              <button
                onClick={() => setShowLearnMore(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 text-sm sm:text-base leading-relaxed text-gray-600">
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">🤖 AI-Powered Adaptive Learning</h3>
                <p>
                  Math Wizard uses artificial intelligence (GPT) to generate unique math questions for every session.
                  The difficulty adapts in real-time — if your child is acing addition, the app will introduce
                  harder problems or new topics automatically. If they struggle, it dials back to build confidence.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">📚 Grade-Based Modules</h3>
                <p>
                  Content spans from Kindergarten through 9th grade and above, covering over 20 modules including
                  Addition, Subtraction, Multiplication, Division, Fractions, Decimals, Algebra, Geometry,
                  Statistics, Calculus basics, and more. Children pick their grade and select which topics to focus on.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">🎮 Two Learning Modes</h3>
                <p>
                  <strong>Play Mode</strong> is relaxed — unlimited questions, instant feedback, and no pressure.
                  <strong> Test Mode</strong> simulates a timed quiz with a fixed set of questions and a score at the end.
                  Both modes award XP and contribute to your child's progress analytics.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">⚔️ Multiplayer Challenges</h3>
                <p>
                  Kids can create a challenge and share a 6-character code with a friend. Both players receive <em>identical</em> questions
                  and race to answer them. Scores and times are compared in a side-by-side results screen.
                  It's a fun way to make math competitive and social!
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">⚡ XP, Levels & Streaks</h3>
                <p>
                  Every correct answer earns XP. Streak bonuses reward consecutive correct answers (up to +20 bonus).
                  Harder questions earn more XP. There are 10 levels to climb — from <em>Number Newbie</em> all
                  the way to <em>Math Wizard Master</em>. Daily goals keep motivation high.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">👨‍👩‍👧 Parent Dashboard</h3>
                <p>
                  Parents get a dedicated dashboard showing weekly activity (questions answered &amp; accuracy over time),
                  topic distribution, strengths, areas for improvement, and a recent activity feed —
                  so they always know how their child is progressing.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">🔒 Privacy First</h3>
                <p>
                  Math Wizard stores only the minimum data needed — name, age, grade, and answer history.
                  All data is stored securely in Firebase. No ads, no tracking, no selling data. Ever.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setShowLearnMore(false); onGetStarted(); }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transform hover:scale-105 transition"
              >
                🚀 Get Started
              </button>
              <button
                onClick={() => setShowLearnMore(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
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
