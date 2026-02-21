/**
 * Unit tests for xpService — pure helper functions.
 * These don't touch Firestore; they test the math/logic layer.
 */

// Mock firebase so the import of xpService doesn't fail
jest.mock('../firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  increment: jest.fn(),
}));

import {
  getLevelForXP,
  xpToNextLevel,
  levelProgress,
  getLevelTitle,
  calculateXPEarned,
  LEVEL_THRESHOLDS,
  LEVEL_TITLES,
} from '../services/xpService';

describe('xpService', () => {
  // ─── getLevelForXP ──────────────────────────
  describe('getLevelForXP', () => {
    it('returns level 1 for 0 XP', () => {
      expect(getLevelForXP(0)).toBe(1);
    });

    it('returns level 2 at exactly 100 XP', () => {
      expect(getLevelForXP(100)).toBe(2);
    });

    it('stays level 1 at 99 XP', () => {
      expect(getLevelForXP(99)).toBe(1);
    });

    it('returns max level 10 at 5000 XP', () => {
      expect(getLevelForXP(5000)).toBe(10);
    });

    it('returns max level 10 well above threshold', () => {
      expect(getLevelForXP(99999)).toBe(10);
    });

    it('returns correct level for each threshold boundary', () => {
      LEVEL_THRESHOLDS.forEach((threshold, i) => {
        expect(getLevelForXP(threshold)).toBe(i + 1);
      });
    });
  });

  // ─── xpToNextLevel ──────────────────────────
  describe('xpToNextLevel', () => {
    it('needs 100 XP from 0 to reach level 2', () => {
      expect(xpToNextLevel(0)).toBe(100);
    });

    it('needs 0 XP to next at exactly a threshold', () => {
      // At 100 XP (level 2), next threshold is 250 → needs 150
      expect(xpToNextLevel(100)).toBe(150);
    });

    it('returns 0 at max level', () => {
      expect(xpToNextLevel(5000)).toBe(0);
      expect(xpToNextLevel(9999)).toBe(0);
    });
  });

  // ─── levelProgress ──────────────────────────
  describe('levelProgress', () => {
    it('returns 0 at the start of a level', () => {
      expect(levelProgress(0)).toBe(0);
    });

    it('returns ~0.5 halfway through level 1 (50/100)', () => {
      expect(levelProgress(50)).toBeCloseTo(0.5, 1);
    });

    it('returns 1 at max level', () => {
      expect(levelProgress(5000)).toBe(1);
    });
  });

  // ─── getLevelTitle ──────────────────────────
  describe('getLevelTitle', () => {
    it('returns "Number Newbie" for level 1', () => {
      expect(getLevelTitle(1)).toBe('Number Newbie');
    });

    it('returns "Math Wizard Master" for level 10', () => {
      expect(getLevelTitle(10)).toBe('Math Wizard Master');
    });

    it('returns a string for every valid level', () => {
      for (let lv = 1; lv <= LEVEL_TITLES.length; lv++) {
        expect(typeof getLevelTitle(lv)).toBe('string');
        expect(getLevelTitle(lv).length).toBeGreaterThan(0);
      }
    });
  });

  // ─── calculateXPEarned ──────────────────────
  describe('calculateXPEarned', () => {
    it('returns 0 XP for incorrect answer', () => {
      expect(calculateXPEarned(false, 5, 'Hard')).toBe(0);
    });

    it('returns base 10 XP for correct answer with no streak and Easy difficulty', () => {
      expect(calculateXPEarned(true, 0, 'Easy')).toBe(10);
    });

    it('adds streak bonus (2 per streak)', () => {
      // streak 3 → +6, total 16
      expect(calculateXPEarned(true, 3, 'Easy')).toBe(16);
    });

    it('caps streak bonus at 20 (streak ≥ 10)', () => {
      // streak 15 → would be 30 but capped at 20, total 30
      expect(calculateXPEarned(true, 15, 'Easy')).toBe(30);
    });

    it('adds difficulty bonus for Medium (+5)', () => {
      expect(calculateXPEarned(true, 0, 'Medium')).toBe(15);
    });

    it('adds difficulty bonus for Hard (+10)', () => {
      expect(calculateXPEarned(true, 0, 'Hard')).toBe(20);
    });

    it('adds difficulty bonus for Very Hard (+15)', () => {
      expect(calculateXPEarned(true, 0, 'Very Hard')).toBe(25);
    });

    it('combines streak + difficulty bonuses', () => {
      // streak 5 → +10, Hard → +10, base 10 → 30
      expect(calculateXPEarned(true, 5, 'Hard')).toBe(30);
    });
  });
});
