/**
 * Unit tests for mathModules data integrity.
 * Ensures all module data is well-formed and consistent.
 */
import { mathModulesByGrade, getModulesByGrade, getRandomTopicByGrade } from '../data/mathModules';

describe('mathModules', () => {
  const GRADE_KEYS = ['KG-1', '2-3', '4-5', '6-7', '7-8', '9+'];

  describe('mathModulesByGrade', () => {
    it('has entries for all expected grade ranges', () => {
      GRADE_KEYS.forEach(key => {
        expect(mathModulesByGrade[key]).toBeDefined();
      });
    });

    it('each grade has a gradeLevel and modules array', () => {
      GRADE_KEYS.forEach(key => {
        const grade = mathModulesByGrade[key];
        expect(grade.gradeLevel).toBeTruthy();
        expect(Array.isArray(grade.modules)).toBe(true);
        expect(grade.modules.length).toBeGreaterThan(0);
      });
    });

    it('each module has name and topics array', () => {
      GRADE_KEYS.forEach(key => {
        mathModulesByGrade[key].modules.forEach(mod => {
          expect(mod.name).toBeTruthy();
          expect(Array.isArray(mod.topics)).toBe(true);
          expect(mod.topics.length).toBeGreaterThan(0);
        });
      });
    });

    it('no duplicate module names within a grade', () => {
      GRADE_KEYS.forEach(key => {
        const names = mathModulesByGrade[key].modules.map(m => m.name);
        const unique = new Set(names);
        expect(unique.size).toBe(names.length);
      });
    });
  });

  describe('getModulesByGrade', () => {
    it('returns the correct grade data', () => {
      const result = getModulesByGrade('2-3');
      expect(result.gradeLevel).toBeTruthy();
      expect(result.modules.length).toBeGreaterThan(0);
    });

    it('returns a fallback for unknown grade', () => {
      const result = getModulesByGrade('unknown');
      // Should return some default or the data structure should still work
      expect(result).toBeDefined();
    });
  });

  describe('getRandomTopicByGrade', () => {
    it('returns a string topic', () => {
      const topic = getRandomTopicByGrade('4-5');
      expect(typeof topic).toBe('string');
      expect(topic.length).toBeGreaterThan(0);
    });

    it('returns different topics on multiple calls (probabilistic)', () => {
      const topics = new Set();
      for (let i = 0; i < 50; i++) {
        topics.add(getRandomTopicByGrade('4-5'));
      }
      // With enough calls, we should get more than 1 unique topic
      expect(topics.size).toBeGreaterThan(1);
    });
  });
});
