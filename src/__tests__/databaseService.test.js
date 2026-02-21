/**
 * Unit tests for databaseService — Firestore interactions.
 * All Firestore calls are mocked.
 */

// Mock firebase/firestore module
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, name) => ({ path: name })),
  doc: jest.fn((db, col, id) => ({ path: `${col}/${id}` })),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  orderBy: jest.fn((...args) => args),
}));

jest.mock('../firebaseConfig', () => ({
  db: {},
}));

import {
  saveUserProfile,
  getUserProfile,
  saveAnswer,
  getUserAnswerHistory,
  getUserStats,
} from '../services/databaseService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('databaseService', () => {
  describe('saveUserProfile', () => {
    it('calls setDoc with the correct user data and merge', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const result = await saveUserProfile('user123', { name: 'Alice', grade: 3, age: 8 });
      expect(result).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [, data, options] = mockSetDoc.mock.calls[0];
      expect(data.name).toBe('Alice');
      expect(data.grade).toBe(3);
      expect(options).toEqual({ merge: true });
    });

    it('throws on Firestore error', async () => {
      mockSetDoc.mockRejectedValue(new Error('permission-denied'));
      await expect(saveUserProfile('user123', { name: 'Bob', grade: 1, age: 5 })).rejects.toThrow('permission-denied');
    });
  });

  describe('getUserProfile', () => {
    it('returns profile data when document exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ name: 'Alice', grade: 3 }),
      });
      const profile = await getUserProfile('user123');
      expect(profile).toEqual({ name: 'Alice', grade: 3 });
    });

    it('returns null when document does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      });
      const profile = await getUserProfile('user123');
      expect(profile).toBeNull();
    });
  });

  describe('saveAnswer', () => {
    it('saves answer data to the answers collection', async () => {
      mockAddDoc.mockResolvedValue({ id: 'answer1' });
      const result = await saveAnswer('user123', {
        question: '2 + 2 = ?',
        operation: 'addition',
        correct: true,
        userAnswer: '4',
        correctAnswer: 4,
      });
      expect(result).toBe(true);
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      const [, data] = mockAddDoc.mock.calls[0];
      expect(data.userId).toBe('user123');
      expect(data.question).toBe('2 + 2 = ?');
      expect(data.correct).toBe(true);
    });
  });

  describe('getUserAnswerHistory', () => {
    it('returns sorted answer history', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { data: () => ({ question: 'Q1', correct: true, timestamp: new Date('2026-01-01') }) },
          { data: () => ({ question: 'Q2', correct: false, timestamp: new Date('2026-01-02') }) },
        ],
      });
      const history = await getUserAnswerHistory('user123');
      expect(history).toHaveLength(2);
      expect(history[0].question).toBe('Q1');
    });
  });

  describe('getUserStats', () => {
    it('returns zero stats when no history', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      const stats = await getUserStats('user123');
      expect(stats.totalQuestions).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.weakAreas).toEqual([]);
    });

    it('calculates accuracy and streak correctly', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { data: () => ({ correct: true, operation: 'addition', timestamp: new Date() }) },
          { data: () => ({ correct: true, operation: 'addition', timestamp: new Date() }) },
          { data: () => ({ correct: false, operation: 'subtraction', timestamp: new Date() }) },
          { data: () => ({ correct: true, operation: 'addition', timestamp: new Date() }) },
        ],
      });
      const stats = await getUserStats('user123');
      expect(stats.totalQuestions).toBe(4);
      expect(stats.accuracy).toBe(75); // 3/4 = 75%
      expect(stats.streak).toBe(1); // last answer correct
      expect(stats.weakAreas.length).toBe(2);
      // Subtraction should be the weakest (0%)
      expect(stats.weakAreas[0].name).toBe('subtraction');
      expect(stats.weakAreas[0].accuracy).toBe(0);
    });
  });
});
