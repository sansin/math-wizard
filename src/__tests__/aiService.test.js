import axios from 'axios';
import { generateQuestion, getWeakTopics } from '../services/aiService';

jest.mock('axios', () => ({
  post: jest.fn(),
}));

describe('aiService edge cases', () => {
  const originalApiKey = process.env.REACT_APP_OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.REACT_APP_OPENAI_API_KEY;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalApiKey) {
      process.env.REACT_APP_OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.REACT_APP_OPENAI_API_KEY;
    }
  });

  it('falls back safely for unknown operation', async () => {
    const result = await generateQuestion([], '4-5', 'unknown_operation');
    expect(typeof result.question).toBe('string');
    expect(result.question.length).toBeGreaterThan(0);
    expect(result.answer).toBeNull();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('returns whole-number division prompts for lower grades', async () => {
    const result = await generateQuestion([], '2-3', 'division');
    expect(result.answer).toBeNull();

    // Covers both symbolic and word-problem templates
    const nums = result.question.match(/\d+/g) || [];
    expect(nums.length).toBeGreaterThanOrEqual(2);
    const dividend = Number(nums[0]);
    const divisor = Number(nums[1]);
    expect(divisor).toBeGreaterThan(0);
    expect(dividend % divisor).toBe(0);
  });

  it('handles invalid grade input by using fallback complexity defaults', async () => {
    const result = await generateQuestion(null, 'invalid-grade', 'addition');
    expect(typeof result.question).toBe('string');
    expect(result.question.length).toBeGreaterThan(0);
    expect(result.answer).toBeNull();
  });

  it('orders weak topics from lowest to highest accuracy', () => {
    const history = [
      { operation: 'addition', correct: true },
      { operation: 'addition', correct: false },
      { operation: 'division', correct: false },
      { operation: 'division', correct: false },
      { operation: 'multiplication', correct: true },
      { operation: 'multiplication', correct: true },
    ];
    expect(getWeakTopics(history)).toEqual(['division', 'addition', 'multiplication']);
  });

  it('returns an empty list for empty or missing history', () => {
    expect(getWeakTopics([])).toEqual([]);
    expect(getWeakTopics(null)).toEqual([]);
  });
});
