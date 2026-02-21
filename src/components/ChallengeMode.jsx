import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createChallenge,
  joinChallenge,
  submitChallengeAnswer,
  onChallengeUpdate,
  CHALLENGE_QUESTION_COUNT,
} from '../services/challengeService';
import { generateQuestion } from '../services/aiService';

/**
 * ChallengeMode — Multiplayer challenge flow.
 *
 * Screens:
 *   1. Lobby  — Create (get code) or Join (enter code)
 *   2. Waiting — Creator waits for opponent to join
 *   3. Game   — Both players answer same questions, live opponent progress
 *   4. Results — Side-by-side comparison
 */

// ─── Helper: parse answer for numeric comparison ──────────────────────

function parseAnswer(str) {
  if (str == null) return NaN;
  const s = String(str).trim();
  // fraction e.g. "3/4"
  if (/^-?\d+\/\d+$/.test(s)) {
    const [n, d] = s.split('/').map(Number);
    return d !== 0 ? n / d : NaN;
  }
  return parseFloat(s);
}

function answersMatch(userAnswer, correctAnswer) {
  const u = String(userAnswer).trim().toLowerCase();
  const c = String(correctAnswer).trim().toLowerCase();
  if (u === c) return true;
  const uNum = parseAnswer(u);
  const cNum = parseAnswer(c);
  if (!isNaN(uNum) && !isNaN(cNum)) return Math.abs(uNum - cNum) < 0.01;
  return false;
}

// ─── Question generator for challenges ────────────────────────────────

const MODULE_TO_OPS = {
  Addition: ['addition'],
  Subtraction: ['subtraction'],
  Multiplication: ['multiplication'],
  Division: ['division'],
  Fractions: ['fractions'],
  'Logic & Patterns': ['logic_patterns'],
  'Arithmetic Operations': ['addition', 'subtraction', 'multiplication', 'division'],
  'Fractions & Decimals': ['fractions', 'decimals'],
  'Variables & Equations': ['algebra'],
  Geometry: ['geometry'],
  Algebra: ['algebra'],
  Arithmetic: ['addition', 'subtraction', 'multiplication', 'division'],
  'Statistics & Probability': ['statistics'],
  'Arithmetic & Number Theory': ['addition', 'subtraction', 'multiplication', 'division'],
  'Fractions, Decimals & Percentages': ['fractions', 'decimals'],
  'Pre-Algebra': ['algebra'],
  'Advanced Reasoning': ['logic_patterns'],
  'Functions & Graphing': ['algebra'],
  'Geometry & Trigonometry': ['geometry'],
  'Exponents & Roots': ['addition'],
  'Functions & Analysis': ['algebra', 'calculus'],
  'Calculus Basics': ['calculus'],
  'Mathematical Reasoning': ['logic_patterns'],
};

async function generateChallengeQuestions(grade, modules, count) {
  const ops = new Set();
  modules.forEach(m => {
    (MODULE_TO_OPS[m] || ['addition']).forEach(o => ops.add(o));
  });
  const opsArr = Array.from(ops);

  const questions = [];
  for (let i = 0; i < count; i++) {
    const op = opsArr[Math.floor(Math.random() * opsArr.length)];
    try {
      const { question, answer } = await generateQuestion([], grade, op, modules);
      questions.push({ question, answer: answer != null ? String(answer) : '', operation: op });
    } catch {
      questions.push({ question: `What is ${i + 2} + ${i + 3}?`, answer: String(i + 5), operation: 'addition' });
    }
  }
  return questions;
}

// ─── Component ────────────────────────────────────────────────────────

export default function ChallengeMode({ userId, userName, userGrade, selectedModules, onBack }) {
  // Screens: 'lobby' | 'waiting' | 'game' | 'results'
  const [screen, setScreen] = useState('lobby');
  const [challengeData, setChallengeData] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(null); // 'creator' | 'opponent'

  // Game state
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [myAnswers, setMyAnswers] = useState([]);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const unsubRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Real-time listener ─────────────────────────────────────────
  const startListening = useCallback((challengeId, myRole) => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = onChallengeUpdate(challengeId, (data) => {
      setChallengeData(data);

      // Track opponent progress
      const opField = myRole === 'creator' ? 'opponentAnswers' : 'creatorAnswers';
      setOpponentProgress((data[opField] || []).length);

      // Creator in waiting → opponent joined → start game
      if (myRole === 'creator' && data.status === 'active' && data.opponentId) {
        setScreen('game');
        setQuestionStartTime(Date.now());
      }

      // Challenge completed
      if (data.status === 'completed') {
        setScreen('results');
      }
    });
  }, []);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // Focus input when question changes
  useEffect(() => {
    if (screen === 'game' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen, currentQ]);

  // ─── Create Challenge ───────────────────────────────────────────
  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const challenge = await createChallenge(
        userId, userName, userGrade, selectedModules,
        generateChallengeQuestions
      );
      setChallengeData(challenge);
      setRole('creator');
      setScreen('waiting');
      startListening(challenge.id, 'creator');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Join Challenge ──────────────────────────────────────────────
  const handleJoin = async () => {
    if (!joinCode.trim()) { setError('Enter a challenge code'); return; }
    setError('');
    setLoading(true);
    try {
      const challenge = await joinChallenge(joinCode.trim(), userId, userName);
      setChallengeData(challenge);
      setRole('opponent');
      setScreen('game');
      setQuestionStartTime(Date.now());
      startListening(challenge.id, 'opponent');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit Answer ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim() || !challengeData || feedback) return;

    const q = challengeData.questions[currentQ];
    const correct = answersMatch(userAnswer, q.answer);
    const timeMs = Date.now() - questionStartTime;

    const answerData = { answer: userAnswer.trim(), correct, timeMs };

    setFeedback({ correct, correctAnswer: q.answer });
    setMyAnswers(prev => [...prev, answerData]);

    try {
      await submitChallengeAnswer(challengeData.id, role, answerData);
    } catch (err) {
      console.error('Failed to submit challenge answer:', err);
    }

    // Advance to next question after delay
    setTimeout(() => {
      if (currentQ + 1 < challengeData.questions.length) {
        setCurrentQ(prev => prev + 1);
        setUserAnswer('');
        setFeedback(null);
        setQuestionStartTime(Date.now());
      }
      // If last question, the real-time listener will detect completion
    }, 1200);
  };

  // ─── Computed results ────────────────────────────────────────────
  const getResults = () => {
    if (!challengeData) return null;
    const ca = challengeData.creatorAnswers || [];
    const oa = challengeData.opponentAnswers || [];
    const creatorScore = ca.filter(a => a.correct).length;
    const opponentScore = oa.filter(a => a.correct).length;
    const creatorTime = ca.reduce((s, a) => s + (a.timeMs || 0), 0);
    const opponentTime = oa.reduce((s, a) => s + (a.timeMs || 0), 0);
    return {
      creatorName: challengeData.creatorName,
      opponentName: challengeData.opponentName,
      creatorScore, opponentScore,
      creatorTime, opponentTime,
      totalQuestions: challengeData.questions.length,
      questions: challengeData.questions,
      creatorAnswers: ca,
      opponentAnswers: oa,
    };
  };

  // ─── RENDER: Lobby ──────────────────────────────────────────────
  if (screen === 'lobby') {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">⚔️ Challenge Mode</h2>
            <p className="text-gray-500 text-sm">Challenge a friend to the same questions!</p>
          </div>

          {/* Create */}
          <button
            onClick={handleCreate}
            disabled={loading || !selectedModules || selectedModules.length === 0}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-xl mb-4 hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50 text-lg"
          >
            {loading ? '⏳ Creating...' : '🎮 Create Challenge'}
          </button>
          {(!selectedModules || selectedModules.length === 0) && (
            <p className="text-xs text-gray-400 text-center -mt-2 mb-3">
              Select modules first to create a challenge
            </p>
          )}

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm font-semibold">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Join */}
          <div className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full p-4 border-2 border-violet-300 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length < 6}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-4 rounded-xl hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50 text-lg"
            >
              {loading ? '⏳ Joining...' : '🤝 Join Challenge'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <button
            onClick={onBack}
            className="w-full mt-6 py-3 text-gray-500 font-semibold hover:text-gray-700 transition"
          >
            ← Back to Modules
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Waiting for Opponent ──────────────────────────────
  if (screen === 'waiting') {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl animate-fade-in text-center">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for Opponent</h2>
          <p className="text-gray-500 mb-6">Share this code with your friend:</p>

          <div className="bg-gradient-to-r from-violet-100 to-purple-100 rounded-2xl p-6 mb-6">
            <p className="text-4xl font-mono font-bold text-violet-700 tracking-[0.3em] select-all">
              {challengeData?.code}
            </p>
          </div>

          <p className="text-sm text-gray-400 mb-6">
            {CHALLENGE_QUESTION_COUNT} questions • {selectedModules.join(', ')}
          </p>

          <div className="flex items-center justify-center gap-2 text-violet-600 animate-pulse">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-semibold">Listening for opponent...</span>
          </div>

          <button
            onClick={() => { if (unsubRef.current) unsubRef.current(); setScreen('lobby'); }}
            className="mt-8 py-3 px-6 text-gray-500 font-semibold hover:text-gray-700 transition"
          >
            ← Cancel
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Game ──────────────────────────────────────────────
  if (screen === 'game' && challengeData) {
    const q = challengeData.questions[currentQ];
    const isLastQ = currentQ + 1 >= challengeData.questions.length;
    const myProgress = myAnswers.length;
    const totalQ = challengeData.questions.length;

    return (
      <div className="max-w-xl mx-auto p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-semibold text-gray-600">
              Question <span className="text-violet-600">{currentQ + 1}/{totalQ}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-bold">
                You: {myAnswers.filter(a => a.correct).length}/{myProgress}
              </span>
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">
                {role === 'creator' ? challengeData.opponentName : challengeData.creatorName}: {opponentProgress}/{totalQ}
              </span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="space-y-2 mb-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                <span>You</span>
                <span>{Math.round((myProgress / totalQ) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-400 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${(myProgress / totalQ) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                <span>Opponent</span>
                <span>{Math.round((opponentProgress / totalQ) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(opponentProgress / totalQ) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question */}
          {q ? (
            <>
              <div className={`bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-5 mb-4 border-2 border-violet-200 ${feedback && !feedback.correct ? 'animate-shake' : ''}`}>
                <h3 className="text-xl font-bold text-gray-800 text-center">{q.question}</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Your answer..."
                  disabled={!!feedback}
                  className="w-full p-4 border-2 border-violet-400 rounded-xl text-lg font-semibold text-center focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 transition disabled:opacity-50 disabled:bg-gray-100"
                  autoFocus
                />

                {!feedback && (
                  <button
                    type="submit"
                    disabled={!userAnswer.trim()}
                    className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50"
                  >
                    Submit ✓
                  </button>
                )}
              </form>

              {/* Feedback */}
              {feedback && (
                <div aria-live="assertive" role="alert" className={`mt-4 p-4 rounded-xl font-bold text-center ${
                  feedback.correct
                    ? 'bg-green-100 text-green-700 border-2 border-green-400'
                    : 'bg-red-50 text-red-700 border-2 border-red-400'
                }`}>
                  {feedback.correct ? '✅ Correct!' : `❌ Wrong — answer: ${feedback.correctAnswer}`}
                  {isLastQ && myAnswers.length >= totalQ && (
                    <p className="text-sm mt-2 opacity-70">
                      {opponentProgress < totalQ ? 'Waiting for opponent to finish...' : 'Both finished!'}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl animate-pulse mb-3">⏳</div>
              <p className="text-gray-500 font-semibold">
                You're done! Waiting for opponent to finish...
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Opponent progress: {opponentProgress}/{totalQ}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Results ───────────────────────────────────────────
  if (screen === 'results' && challengeData) {
    const r = getResults();
    if (!r) return null;

    const iAmCreator = role === 'creator';
    const myScore = iAmCreator ? r.creatorScore : r.opponentScore;
    const theirScore = iAmCreator ? r.opponentScore : r.creatorScore;
    const myTime = iAmCreator ? r.creatorTime : r.opponentTime;
    const theirTime = iAmCreator ? r.opponentTime : r.creatorTime;
    const myName = iAmCreator ? r.creatorName : r.opponentName;
    const theirName = iAmCreator ? r.opponentName : r.creatorName;
    const myAns = iAmCreator ? r.creatorAnswers : r.opponentAnswers;
    const theirAns = iAmCreator ? r.opponentAnswers : r.creatorAnswers;

    const iWon = myScore > theirScore || (myScore === theirScore && myTime < theirTime);
    const tie = myScore === theirScore && Math.abs(myTime - theirTime) < 500;

    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-6 shadow-xl animate-fade-in">
          {/* Winner banner */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">{tie ? '🤝' : iWon ? '🏆' : '💪'}</div>
            <h2 className="text-2xl font-bold text-gray-800">
              {tie ? "It's a Tie!" : iWon ? 'You Win!' : `${theirName} Wins!`}
            </h2>
          </div>

          {/* Score comparison */}
          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className={`rounded-xl p-4 ${iWon ? 'bg-violet-100 border-2 border-violet-400' : 'bg-gray-50'}`}>
              <p className="text-sm font-semibold text-gray-500 mb-1 truncate">{myName} (You)</p>
              <p className="text-3xl font-bold text-violet-600">{myScore}</p>
              <p className="text-xs text-gray-400">{(myTime / 1000).toFixed(1)}s</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-300">vs</span>
            </div>
            <div className={`rounded-xl p-4 ${!iWon && !tie ? 'bg-amber-100 border-2 border-amber-400' : 'bg-gray-50'}`}>
              <p className="text-sm font-semibold text-gray-500 mb-1 truncate">{theirName}</p>
              <p className="text-3xl font-bold text-amber-600">{theirScore}</p>
              <p className="text-xs text-gray-400">{(theirTime / 1000).toFixed(1)}s</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-violet-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Your Accuracy</p>
              <p className="text-xl font-bold text-violet-600">
                {r.totalQuestions > 0 ? Math.round((myScore / r.totalQuestions) * 100) : 0}%
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Their Accuracy</p>
              <p className="text-xl font-bold text-amber-600">
                {r.totalQuestions > 0 ? Math.round((theirScore / r.totalQuestions) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Question-by-question breakdown */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">Question Breakdown</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {r.questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-400 font-mono w-5">{i + 1}.</span>
                  <span className="flex-1 truncate text-gray-700">{q.question}</span>
                  <span className={`w-6 text-center ${myAns[i]?.correct ? 'text-green-600' : 'text-red-500'}`}>
                    {myAns[i]?.correct ? '✓' : '✗'}
                  </span>
                  <span className={`w-6 text-center ${theirAns[i]?.correct ? 'text-green-600' : 'text-red-500'}`}>
                    {theirAns[i]?.correct ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4 mt-1 text-xs text-gray-400">
              <span>You</span>
              <span>Them</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                if (unsubRef.current) unsubRef.current();
                setChallengeData(null);
                setMyAnswers([]);
                setCurrentQ(0);
                setUserAnswer('');
                setFeedback(null);
                setOpponentProgress(0);
                setScreen('lobby');
                setError('');
              }}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition"
            >
              ⚔️ New Challenge
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700 transition"
            >
              ← Back to Modules
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
