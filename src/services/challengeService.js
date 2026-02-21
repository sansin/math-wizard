/**
 * Challenge / Multiplayer Service
 *
 * Firestore collection: "challenges"
 * Document schema:
 *   {
 *     code: string,              // 6-char alphanumeric join code
 *     creatorId: string,
 *     creatorName: string,
 *     opponentId: string | null,
 *     opponentName: string | null,
 *     grade: string,             // e.g. '2-3'
 *     modules: string[],         // selected module names
 *     questions: Array<{ question: string, answer: string|number, operation: string }>,
 *     status: 'waiting' | 'active' | 'completed',
 *     creatorAnswers: Array<{ answer: string, correct: boolean, timeMs: number }>,
 *     opponentAnswers: Array<{ answer: string, correct: boolean, timeMs: number }>,
 *     createdAt: Timestamp,
 *     startedAt: Timestamp | null,
 *     completedAt: Timestamp | null,
 *   }
 */

import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

const CHALLENGES_COL = 'challenges';
const CHALLENGE_QUESTION_COUNT = 5;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Generate a 6-character alphanumeric code (uppercase) */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Create Challenge ────────────────────────────────────────────────

/**
 * Create a new challenge and return the challenge document data.
 * The creator pre-generates questions so both players get the same set.
 *
 * @param {string} userId
 * @param {string} userName
 * @param {string} grade           e.g. '2-3'
 * @param {string[]} modules       selected module names
 * @param {Function} questionGenerator  async (grade, modules) => Array<{question, answer, operation}>
 * @returns {{ id: string, code: string, ...rest }}
 */
export const createChallenge = async (userId, userName, grade, modules, questionGenerator) => {
  const code = generateCode();
  const id = `challenge_${code}_${Date.now()}`;

  // Generate questions
  const questions = await questionGenerator(grade, modules, CHALLENGE_QUESTION_COUNT);

  const challengeDoc = {
    code,
    creatorId: userId,
    creatorName: userName,
    opponentId: null,
    opponentName: null,
    grade,
    modules,
    questions,
    status: 'waiting',
    creatorAnswers: [],
    opponentAnswers: [],
    createdAt: serverTimestamp(),
    startedAt: null,
    completedAt: null,
  };

  await setDoc(doc(db, CHALLENGES_COL, id), challengeDoc);
  return { id, ...challengeDoc };
};

// ─── Join Challenge ──────────────────────────────────────────────────

/**
 * Join an existing challenge by code.
 * Returns the challenge data or throws if not found / already full.
 */
export const joinChallenge = async (code, userId, userName) => {
  const q = query(
    collection(db, CHALLENGES_COL),
    where('code', '==', code.toUpperCase()),
    where('status', '==', 'waiting')
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Challenge not found or already started.');
  }

  const challengeDoc = snap.docs[0];
  const data = challengeDoc.data();

  if (data.creatorId === userId) {
    throw new Error("You can't join your own challenge!");
  }

  await updateDoc(doc(db, CHALLENGES_COL, challengeDoc.id), {
    opponentId: userId,
    opponentName: userName,
    status: 'active',
    startedAt: serverTimestamp(),
  });

  return { id: challengeDoc.id, ...data, opponentId: userId, opponentName: userName, status: 'active' };
};

// ─── Submit Answer ───────────────────────────────────────────────────

/**
 * Submit an answer for the current question.
 *
 * @param {string} challengeId
 * @param {string} role  'creator' | 'opponent'
 * @param {{ answer: string, correct: boolean, timeMs: number }} answerData
 */
export const submitChallengeAnswer = async (challengeId, role, answerData) => {
  const ref = doc(db, CHALLENGES_COL, challengeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Challenge not found');

  const data = snap.data();
  const field = role === 'creator' ? 'creatorAnswers' : 'opponentAnswers';
  const currentAnswers = data[field] || [];
  const updatedAnswers = [...currentAnswers, answerData];

  const updates = { [field]: updatedAnswers };

  // Check if both players have finished
  const otherField = role === 'creator' ? 'opponentAnswers' : 'creatorAnswers';
  const otherAnswers = data[otherField] || [];
  if (updatedAnswers.length >= data.questions.length && otherAnswers.length >= data.questions.length) {
    updates.status = 'completed';
    updates.completedAt = serverTimestamp();
  }

  await updateDoc(ref, updates);
  return updates;
};

// ─── Get Challenge ───────────────────────────────────────────────────

export const getChallenge = async (challengeId) => {
  const ref = doc(db, CHALLENGES_COL, challengeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ─── Real-time Listener ──────────────────────────────────────────────

/**
 * Subscribe to real-time updates on a challenge document.
 * Returns an unsubscribe function.
 */
export const onChallengeUpdate = (challengeId, callback) => {
  const ref = doc(db, CHALLENGES_COL, challengeId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
};

export { CHALLENGE_QUESTION_COUNT };
