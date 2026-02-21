/**
 * XP & Level System for Math Wizard
 *
 * Rewards:
 *   Base correct answer  = 10 XP
 *   Streak bonus         = +2 XP per streak level (caps at 10-streak = +20)
 *   Difficulty bonus     = Easy +0, Medium +5, Hard +10, Very Hard +15
 *
 * Level thresholds are exponential so early levels come quickly and later
 * ones require sustained effort:
 *   Level  1 =      0 XP
 *   Level  2 =    100 XP
 *   Level  3 =    250 XP
 *   Level  4 =    500 XP
 *   Level  5 =    800 XP
 *   Level  6 =  1 200 XP
 *   Level  7 =  1 700 XP
 *   Level  8 =  2 500 XP
 *   Level  9 =  3 500 XP
 *   Level 10 =  5 000 XP  ← Math Wizard Master
 */

import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

// ─── Constants ───────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2500, 3500, 5000];

const LEVEL_TITLES = [
  'Number Newbie',       // 1
  'Math Explorer',       // 2
  'Problem Solver',      // 3
  'Equation Expert',     // 4
  'Fraction Hero',       // 5
  'Algebra Ace',         // 6
  'Geometry Guru',       // 7
  'Calculus Captain',    // 8
  'Math Legend',         // 9
  'Math Wizard Master',  // 10
];

const DIFFICULTY_BONUS = {
  'Very Easy': 0,
  'Easy': 0,
  'Medium': 5,
  'Hard': 10,
  'Very Hard': 15,
};

const BASE_XP = 10;
const STREAK_BONUS_PER = 2;   // per streak level
const MAX_STREAK_BONUS = 20;  // cap at 10-streak

const DEFAULT_DAILY_GOAL = 10;

// ─── Pure helpers ────────────────────────────────────────────────────

/** Return the level (1-10) for a given total XP amount */
export const getLevelForXP = (xp) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
};

/** XP required to reach the NEXT level (returns 0 if max) */
export const xpToNextLevel = (xp) => {
  const level = getLevelForXP(xp);
  if (level >= LEVEL_THRESHOLDS.length) return 0; // max level
  return LEVEL_THRESHOLDS[level] - xp;
};

/** How far through the current level as a 0-1 fraction */
export const levelProgress = (xp) => {
  const level = getLevelForXP(xp);
  if (level >= LEVEL_THRESHOLDS.length) return 1; // max
  const base = LEVEL_THRESHOLDS[level - 1];
  const next = LEVEL_THRESHOLDS[level];
  return (xp - base) / (next - base);
};

/** Title for a given level */
export const getLevelTitle = (level) =>
  LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1] || LEVEL_TITLES[0];

/** Calculate XP earned from one answer */
export const calculateXPEarned = (correct, streak, difficulty) => {
  if (!correct) return 0;
  const streakBonus = Math.min(streak * STREAK_BONUS_PER, MAX_STREAK_BONUS);
  const diffBonus = DIFFICULTY_BONUS[difficulty] || 0;
  return BASE_XP + streakBonus + diffBonus;
};

export { LEVEL_THRESHOLDS, LEVEL_TITLES, DEFAULT_DAILY_GOAL };

// ─── Firestore helpers ───────────────────────────────────────────────

/** Get the XP document for a user (creates defaults if missing) */
export const getUserXP = async (userId) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  return {
    totalXP: data.totalXP || 0,
    level: data.level || 1,
    dailyQuestions: data.lastActiveDate === today ? (data.dailyQuestions || 0) : 0,
    dailyGoal: data.dailyGoal || DEFAULT_DAILY_GOAL,
    lastActiveDate: data.lastActiveDate || today,
  };
};

/**
 * Award XP for answering a question.
 * Uses setDoc with merge and increment() for atomic XP updates.
 * Returns { xpEarned, totalXP, level, leveledUp, dailyQuestions, dailyGoal }
 */
export const awardXP = async (userId, { correct, streak, difficulty }) => {
  const xpEarned = calculateXPEarned(correct, streak, difficulty);
  const today = new Date().toISOString().slice(0, 10);
  const ref = doc(db, 'users', userId);

  // Read current state once
  const current = await getUserXP(userId);
  const isNewDay = current.lastActiveDate !== today;
  const newDaily = isNewDay ? 1 : current.dailyQuestions + 1;

  try {
    if (xpEarned === 0) {
      // Wrong answer — only update daily counter
      await setDoc(ref, {
        dailyQuestions: newDaily,
        lastActiveDate: today,
      }, { merge: true });

      return {
        xpEarned: 0,
        totalXP: current.totalXP,
        level: current.level,
        leveledUp: false,
        dailyQuestions: newDaily,
        dailyGoal: current.dailyGoal,
      };
    }

    // Correct answer — use increment() for atomic XP update
    const newTotalXP = current.totalXP + xpEarned;
    const oldLevel = getLevelForXP(current.totalXP);
    const newLevel = getLevelForXP(newTotalXP);

    await setDoc(ref, {
      totalXP: increment(xpEarned),
      level: newLevel,
      dailyQuestions: newDaily,
      dailyGoal: current.dailyGoal || DEFAULT_DAILY_GOAL,
      lastActiveDate: today,
    }, { merge: true });

    return {
      xpEarned,
      totalXP: newTotalXP,
      level: newLevel,
      leveledUp: newLevel > oldLevel,
      dailyQuestions: newDaily,
      dailyGoal: current.dailyGoal || DEFAULT_DAILY_GOAL,
    };
  } catch (e) {
    console.error('Failed to award XP:', e);
    // Return current state on error
    return {
      xpEarned: 0,
      totalXP: current.totalXP,
      level: current.level,
      leveledUp: false,
      dailyQuestions: current.dailyQuestions,
      dailyGoal: current.dailyGoal,
    };
  }
};
