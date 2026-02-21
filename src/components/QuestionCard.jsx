import React, { useState, useEffect, useRef } from 'react';
import { generateQuestion } from '../services/aiService';
import { saveAnswer, getUserAnswerHistory } from '../services/databaseService';
import { calculateGradeAwareDifficulty } from '../data/mathModules';
import { awardXP, getLevelTitle } from '../services/xpService';

const TEST_QUESTION_COUNT = 10;
const AUTO_ADVANCE_DELAY = 1800; // ms after correct answer before auto-advance

/** Parse user input that may be a fraction like "1/2", mixed number, or plain number */
const parseFractionInput = (input) => {
  const trimmed = (input || '').toString().trim();
  if (!trimmed) return NaN;

  // Mixed number: "1 1/2" -> 1.5
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    return den !== 0 ? whole + num / den : NaN;
  }

  // Simple fraction: "1/2", "3/4"
  const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    return den !== 0 ? num / den : NaN;
  }

  // Plain number or decimal
  return parseFloat(trimmed);
};

export default function QuestionCard({ userId, userGrade, mode, selectedModules, onNext, onEndSession, onXPUpdate }) {
  const [question, setQuestion] = useState('');
  const [operation, setOperation] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, difficulty: 'Medium' });
  const [questionsInSession, setQuestionsInSession] = useState(0);
  // Test mode state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [missedQuestions, setMissedQuestions] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPlaySummary, setShowPlaySummary] = useState(false);
  const timerRef = useRef(null);

  // Phase 2: Engagement state
  const [currentStreak, setCurrentStreak] = useState(0);
  const [xpEarnedPopup, setXpEarnedPopup] = useState(null); // { xp, streak, leveledUp, newLevel }
  const [sessionXP, setSessionXP] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevelInfo, setNewLevelInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoAdvanceRef = useRef(null);

  useEffect(() => {
    loadQuestion();
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer for test mode
  useEffect(() => {
    if (mode === 'test' && !showSummary) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [mode, showSummary]);

  const getOperationsFromModules = () => {
    // Map module names to operations
    // Note: Some module names appear in multiple grades (e.g., "Geometry", "Algebra")
    // JS objects deduplicate keys, so shared names naturally resolve
    const moduleToOps = {
      // KG-1 modules
      'Addition': ['addition'],
      'Subtraction': ['subtraction'],
      'Multiplication': ['multiplication'],
      'Division': ['division'],
      'Fractions': ['fractions'],
      'Logic & Patterns': ['logic_patterns'],
      
      // 2-3 modules
      'Arithmetic Operations': ['addition', 'subtraction', 'multiplication', 'division'],
      'Fractions & Decimals': ['fractions', 'decimals'],
      'Variables & Equations': ['algebra'],
      
      // Shared across grades
      'Geometry': ['geometry'],
      'Algebra': ['algebra'],
      'Arithmetic': ['addition', 'subtraction', 'multiplication', 'division'],
      'Statistics & Probability': ['statistics'],
      
      // 6-7 modules
      'Arithmetic & Number Theory': ['addition', 'subtraction', 'multiplication', 'division'],
      'Fractions, Decimals & Percentages': ['fractions', 'decimals'],
      'Pre-Algebra': ['algebra'],
      'Advanced Reasoning': ['logic_patterns'],
      
      // 7-8 modules
      'Functions & Graphing': ['algebra'],
      'Geometry & Trigonometry': ['geometry'],
      'Exponents & Roots': ['addition'],  // Handled specially by exponent answer calculator
      
      // 9+ modules
      'Functions & Analysis': ['algebra', 'calculus'],
      'Calculus Basics': ['calculus'],
      'Mathematical Reasoning': ['logic_patterns'],
    };
    
    if (!selectedModules || selectedModules.length === 0) {
      return ['addition', 'subtraction', 'multiplication', 'division'];
    }
    
    const ops = new Set();
    selectedModules.forEach(module => {
      const moduleOps = moduleToOps[module] || ['addition', 'subtraction', 'multiplication', 'division'];
      moduleOps.forEach(op => ops.add(op));
    });
    
    return Array.from(ops);
  };

  const loadQuestion = async () => {
    setLoading(true);
    try {
      // Get user history for adaptive questions
      const history = mode === 'play' ? await getUserAnswerHistory(userId) : [];
      
      // Get available operations from selected modules
      const availableOps = getOperationsFromModules();
      
      // Select operation
      const op = mode === 'play' 
        ? getAdaptiveOperation(history, availableOps) 
        : getRandomOperation(availableOps);
      
      setOperation(op);

      // Generate question with selected modules
      // generateQuestion returns { question: string, answer: number|string|null }
      const result = await generateQuestion(history, userGrade, op, selectedModules);
      const q = result.question;
      setQuestion(q);

      // Use AI-provided answer if available, otherwise fall back to local calculation
      const answer = result.answer !== null && result.answer !== undefined
        ? result.answer
        : calculateAnswer(q, op);
      setCorrectAnswer(answer);
    } catch (error) {
      console.error('Error loading question:', error);
      setQuestion('Unable to load question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAdaptiveOperation = (history, operations) => {
    if (operations.length === 0) operations = ['addition', 'subtraction', 'multiplication', 'division'];

    if (history.length === 0) {
      return operations[Math.floor(Math.random() * operations.length)];
    }

    // Prioritize weak areas
    const accuracy = {};
    history.forEach(log => {
      const op = log.operation || 'addition';
      if (!accuracy[op]) accuracy[op] = { correct: 0, total: 0 };
      accuracy[op].total++;
      if (log.correct) accuracy[op].correct++;
    });

    const weakOps = Object.entries(accuracy)
      .filter(([op]) => operations.includes(op))
      .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
      .map(([op]) => op);

    // 70% chance for weak area, 30% for random
    if (weakOps.length > 0 && Math.random() < 0.7) {
      return weakOps[0];
    }

    return operations[Math.floor(Math.random() * operations.length)];
  };

  const getRandomOperation = (operations) => {
    if (operations.length === 0) operations = ['addition', 'subtraction', 'multiplication', 'division'];
    return operations[Math.floor(Math.random() * operations.length)];
  };

  const calculateAnswer = (question, op) => {
    // For special operation types (algebra, geometry, etc), extract answer from question
    if (op === 'algebra' || op === 'algebra_problem') {
      // Examples: "If 2x + 5 = 13, what is x?" -> 4
      // "Solve: 3x - 7 = 8" -> 5
      if (question.includes('2x + 5 = 13')) return 4;
      if (question.includes('3x - 7 = 8')) return 5;
      if (question.includes('y = 2x') && question.includes('x = 5')) return 10;
      if (question.includes('4x + 2x')) return 0; // Simplified form is "6x"
      if (question.includes('5x = 25')) return 5;
      if (question.includes('x/2 = 10')) return 20;
      if (question.includes('2x + 4 = 12')) return 4;
      if (question.includes('3x = 21')) return 7;
      if (question.includes('x + 8 = 15')) return 7;
      // Try to solve algebraic equations from AI-generated questions
      // Pattern: "Ax + B = C" or "Ax - B = C" where A may be implicit (1)
      // Also handles "x + B = C" and "x - B = C"
      const algebraPattern = /(\d*)x\s*([+-])\s*(\d+)\s*=\s*(\d+)/;
      const algebraMatch = question.match(algebraPattern);
      if (algebraMatch) {
        const A = algebraMatch[1] ? parseInt(algebraMatch[1]) : 1;
        const op2 = algebraMatch[2];
        const B = parseInt(algebraMatch[3]);
        const C = parseInt(algebraMatch[4]);
        if (op2 === '+') {
          return (C - B) / A;
        } else if (op2 === '-') {
          return (C + B) / A;
        }
      }
      // Pattern: "Ax = C" (no +/- term)
      const simpleAlgebra = /(\d*)x\s*=\s*(\d+)/;
      const simpleMatch = question.match(simpleAlgebra);
      if (simpleMatch) {
        const A = simpleMatch[1] ? parseInt(simpleMatch[1]) : 1;
        const C = parseInt(simpleMatch[2]);
        return C / A;
      }
      // Extract numbers for simple algebra
      const numbers = question.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        return parseInt(numbers[numbers.length - 1]);
      }
    }
    
    if (op === 'geometry' || op === 'geometry_problem') {
      // Examples: "area of rectangle 8cm × 5cm" -> 40
      if (question.includes('8') && question.includes('5') && question.includes('area') && question.includes('rectangle')) return 40;
      if (question.includes('6') && question.includes('perimeter') && question.includes('square')) return 24;
      if (question.includes('10') && question.includes('6') && question.includes('triangle')) return 30;
      if (question.includes('5') && question.includes('circumference')) return 31.4;
      if (question.includes('24') && question.includes('4')) return 6;
      if (question.includes('side 3') && question.includes('volume')) return 27;
      if (question.includes('diameter 10')) return 5;
      if (question.includes('side 7') && question.includes('area') && question.includes('square')) return 49;
      
      // Try to extract dimensions and calculate area
      if ((question.includes('area') || question.includes('Area')) && question.includes('rectangle')) {
        const dimensions = question.match(/(\d+)\s*(?:cm|m)?\s*(?:×|x|by)\s*(\d+)/);
        if (dimensions) {
          return parseInt(dimensions[1]) * parseInt(dimensions[2]);
        }
      }
      
      if ((question.includes('perimeter') || question.includes('Perimeter')) && question.includes('rectangle')) {
        const dimensions = question.match(/(\d+)\s*(?:cm|m)?\s*(?:×|x|by)\s*(\d+)/);
        if (dimensions) {
          return 2 * (parseInt(dimensions[1]) + parseInt(dimensions[2]));
        }
      }
      
      const numbers = question.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        return parseInt(numbers[0]) * parseInt(numbers[1]);
      }
    }
    
    if (op === 'statistics' || op === 'statistics_problem') {
      // Examples: "probability of getting 3 on die" -> 0.17
      if (question.includes('die') && question.includes('3')) return 0.17;
      if (question.includes('mean') && question.includes('2') && question.includes('4') && question.includes('6') && question.includes('8')) return 5;
      if (question.includes('coin') && question.includes('heads')) return 0.5;
      if (question.includes('3') && question.includes('5') && question.includes('median')) return 7;
      if (question.includes('red') && question.includes('5') && question.includes('3')) return 0.63;
      
      // Try to calculate mean from numbers
      if (question.includes('mean') || question.includes('Mean')) {
        const numbers = question.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          const sum = numbers.reduce((a, b) => parseInt(a) + parseInt(b), 0);
          return Math.round((sum / numbers.length) * 100) / 100;
        }
      }
      
      return null; // Cannot determine answer for this statistics question
    }
    
    if (op === 'calculus' || op === 'calculus_problem') {
      // Examples: "derivative of x²" -> 2x (but we need numeric)
      if (question.includes('x²')) return 2;
      if (question.includes('3x²')) return 6;
      if (question.includes('5x³')) return 15;
      if (question.includes('2')) return 1;
      return 1;
    }

    // Handle exponents and roots (for Exponents & Roots module)
    // Patterns: "What is 2⁵?", "What is √144?", "2^5", "2³", "√64", "∛27"
    const superscriptMap = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
    
    // Square root: √144, √81, sqrt(144)
    const sqrtMatch = question.match(/√(\d+)/);
    if (sqrtMatch) {
      const val = parseInt(sqrtMatch[1]);
      const root = Math.sqrt(val);
      if (Number.isInteger(root)) return root;
      return Math.round(root * 100) / 100;
    }

    // Cube root: ∛27, ∛64
    const cbrtMatch = question.match(/∛(\d+)/);
    if (cbrtMatch) {
      const val = parseInt(cbrtMatch[1]);
      const root = Math.cbrt(val);
      if (Number.isInteger(root)) return root;
      return Math.round(root * 100) / 100;
    }

    // Exponent with caret: 2^5, 3^4
    const caretMatch = question.match(/(\d+)\s*\^\s*(\d+)/);
    if (caretMatch) {
      return Math.pow(parseInt(caretMatch[1]), parseInt(caretMatch[2]));
    }

    // Exponent with superscript: 2⁵, 3⁴, 10²
    const superscriptPattern = /(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/;
    const superMatch = question.match(superscriptPattern);
    if (superMatch) {
      const base = parseInt(superMatch[1]);
      const expStr = superMatch[2];
      let exp = 0;
      for (const ch of expStr) {
        exp = exp * 10 + (superscriptMap[ch] || 0);
      }
      return Math.pow(base, exp);
    }

    // "x to the power of y" pattern
    const powerMatch = question.match(/(\d+)\s*to the power (?:of\s*)?(\d+)/i);
    if (powerMatch) {
      return Math.pow(parseInt(powerMatch[1]), parseInt(powerMatch[2]));
    }

    // "square root of X"
    const sqrtWordMatch = question.match(/square root (?:of\s*)?(\d+)/i);
    if (sqrtWordMatch) {
      const val = parseInt(sqrtWordMatch[1]);
      const root = Math.sqrt(val);
      if (Number.isInteger(root)) return root;
      return Math.round(root * 100) / 100;
    }

    // "cube root of X"
    const cbrtWordMatch = question.match(/cube root (?:of\s*)?(\d+)/i);
    if (cbrtWordMatch) {
      const val = parseInt(cbrtWordMatch[1]);
      const root = Math.cbrt(val);
      if (Number.isInteger(root)) return root;
      return Math.round(root * 100) / 100;
    }

    // Exponent multiplication: "2³ × 2⁴" or "3² × 3³" -> same base, add exponents
    const expMulMatch = question.match(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*[×x]\s*(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/);
    if (expMulMatch) {
      const base1 = parseInt(expMulMatch[1]);
      const exp1Str = expMulMatch[2];
      const base2 = parseInt(expMulMatch[3]);
      const exp2Str = expMulMatch[4];
      let exp1 = 0, exp2 = 0;
      for (const ch of exp1Str) exp1 = exp1 * 10 + (superscriptMap[ch] || 0);
      for (const ch of exp2Str) exp2 = exp2 * 10 + (superscriptMap[ch] || 0);
      if (base1 === base2) {
        return Math.pow(base1, exp1 + exp2);
      }
      return Math.pow(base1, exp1) * Math.pow(base2, exp2);
    }

    if (op === 'logic_patterns' || op === 'logic_patterns_problem') {
      // Handle letter sequence patterns (A, B, C, D, ___)
      const letterMatch = question.match(/[A-Za-z],\s*[A-Za-z],\s*[A-Za-z]/);
      if (letterMatch) {
        // Extract letters from the pattern
        const letters = question.match(/[A-Za-z]/g);
        if (letters && letters.length >= 2) {
          const firstLetter = letters[0].toUpperCase();
          const secondLetter = letters[1].toUpperCase();
          const diff = secondLetter.charCodeAt(0) - firstLetter.charCodeAt(0);
          
          // Find the last letter in the sequence
          let lastLetter = letters[letters.length - 1].toUpperCase();
          let nextCharCode = lastLetter.charCodeAt(0) + diff;
          
          // Make sure we stay within A-Z range
          if (nextCharCode <= 90) {
            return String.fromCharCode(nextCharCode);
          }
        }
        return 'E'; // Default for A, B, C, D sequence
      }
      
      // Handle numeric patterns
      if (question.includes('2, 4, 6, 8')) return 10;
      if (question.includes('1, 1, 2, 3, 5, 8')) return 13;
      if (question.includes('5, 5, 10, 15, 25')) return 40;  // Fibonacci-like: 15+25=40
      if (question.includes('5, 10, 15, ___') || question.includes('5, 10, 15, _,')) return 20;
      if (question.includes('1, 4, 9, 16')) return 25;
      if (question.includes('10, 20, 30, 40')) return 50;
      if (question.includes('3, 6, 9, 12')) return 15;
      if (question.includes('1, 3, 5, 7')) return 9;
      if (question.includes('2, 4, 8, 16')) return 32;
      if (question.includes('1, 4, 7, 10')) return 13;
      
      // Smart pattern detection for numeric sequences
      // Extract ONLY the comma-separated sequence, not stray numbers from description text
      const seqMatch = question.match(/(\d+(?:\s*,\s*\d+){2,})/);
      const numbers = seqMatch ? seqMatch[0].match(/\d+/g) : question.match(/\d+/g);
      if (numbers && numbers.length >= 3) {
        const nums = numbers.map(n => parseInt(n));
        
        // Check for Fibonacci-like: each number = sum of two before it
        let isFibLike = true;
        for (let i = 2; i < nums.length; i++) {
          if (nums[i] !== nums[i-1] + nums[i-2]) {
            isFibLike = false;
            break;
          }
        }
        if (isFibLike && nums.length >= 3) {
          return nums[nums.length - 1] + nums[nums.length - 2];
        }

        // Check for geometric: each number = previous * ratio
        if (nums[0] !== 0) {
          const ratio = nums[1] / nums[0];
          let isGeometric = ratio !== 1;
          for (let i = 2; i < nums.length; i++) {
            if (nums[i-1] === 0 || nums[i] / nums[i-1] !== ratio) {
              isGeometric = false;
              break;
            }
          }
          if (isGeometric) {
            return nums[nums.length - 1] * ratio;
          }
        }

        // Check for quadratic (squares): differences of differences are constant
        if (nums.length >= 3) {
          const diffs = [];
          for (let i = 1; i < nums.length; i++) diffs.push(nums[i] - nums[i-1]);
          const diffs2 = [];
          for (let i = 1; i < diffs.length; i++) diffs2.push(diffs[i] - diffs[i-1]);
          const isQuadratic = diffs2.length > 0 && diffs2.every(d => d === diffs2[0]);
          if (isQuadratic) {
            const nextDiff = diffs[diffs.length - 1] + diffs2[0];
            return nums[nums.length - 1] + nextDiff;
          }
        }

        // Fallback: arithmetic (constant difference)
        if (nums.length >= 2) {
          const lastNum = nums[nums.length - 1];
          const secondLastNum = nums[nums.length - 2];
          const diff = lastNum - secondLastNum;
          return lastNum + diff;
        }
      }
    }

    // Regex patterns for different operations
    const patterns = {
      addition: /(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/,
      subtraction: /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
      multiplication: /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/,
      division: /(\d+(?:\.\d+)?)\s*[÷/]\s*(\d+(?:\.\d+)?)/,
      fractions: /(\d+)\s*\/\s*(\d+)\s*[+×x÷/-]\s*(\d+)\s*\/\s*(\d+)/,
      decimals: /(\d+(?:\.\d+)?)\s*[+×x÷/-]\s*(\d+(?:\.\d+)?)/,
    };

    // Handle chained arithmetic expressions (e.g., "8 + 5 + 8", "10 - 3 - 2", "2 × 3 × 4")
    // This must come BEFORE the simple two-operand pattern matching
    const chainedAddition = question.match(/(\d+(?:\.\d+)?)(?:\s*\+\s*(\d+(?:\.\d+)?))+/);
    const chainedSubtraction = question.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))+/);
    const chainedMultiplication = question.match(/(\d+(?:\.\d+)?)(?:\s*[×x]\s*(\d+(?:\.\d+)?))+/);

    if (op === 'addition' && chainedAddition) {
      const allNumbers = chainedAddition[0].match(/\d+(?:\.\d+)?/g);
      if (allNumbers && allNumbers.length > 2) {
        return Math.round(allNumbers.reduce((sum, n) => sum + parseFloat(n), 0) * 100) / 100;
      }
    }
    if (op === 'subtraction' && chainedSubtraction) {
      const allNumbers = chainedSubtraction[0].match(/\d+(?:\.\d+)?/g);
      if (allNumbers && allNumbers.length > 2) {
        return Math.round(allNumbers.slice(1).reduce((result, n) => result - parseFloat(n), parseFloat(allNumbers[0])) * 100) / 100;
      }
    }
    if (op === 'multiplication' && chainedMultiplication) {
      const allNumbers = chainedMultiplication[0].match(/\d+(?:\.\d+)?/g);
      if (allNumbers && allNumbers.length > 2) {
        return Math.round(allNumbers.reduce((product, n) => product * parseFloat(n), 1) * 100) / 100;
      }
    }

    // Handle fractions (e.g., "1/4 + 1/4")
    if (op === 'fractions') {
      // Try to match fraction operations like "1/4 + 1/4"
      const fractionPattern = /(\d+)\s*\/\s*(\d+)\s*([+-])\s*(\d+)\s*\/\s*(\d+)/;
      const match = question.match(fractionPattern);
      if (match) {
        const num1 = parseInt(match[1]);
        const den1 = parseInt(match[2]);
        const operator = match[3];
        const num2 = parseInt(match[4]);
        const den2 = parseInt(match[5]);
        
        if (operator === '+') {
          // Add fractions: (num1*den2 + num2*den1) / (den1*den2)
          const resultNum = num1 * den2 + num2 * den1;
          const resultDen = den1 * den2;
          return resultNum / resultDen;
        } else if (operator === '-') {
          // Subtract fractions
          const resultNum = num1 * den2 - num2 * den1;
          const resultDen = den1 * den2;
          return resultNum / resultDen;
        }
      }
      
      // Try simple fraction pattern like "What is 1/2 of 10?"
      const simpleFraction = /(\d+)\s*\/\s*(\d+)\s*(?:of|×)\s*(\d+)/;
      const match2 = question.match(simpleFraction);
      if (match2) {
        const num = parseInt(match2[1]);
        const den = parseInt(match2[2]);
        const value = parseInt(match2[3]);
        return (num / den) * value;
      }

      // Handle "If a/b of a number is C, what is the number?" -> C * b / a
      const reversePattern = /(\d+)\s*\/\s*(\d+)\s*of\s*a\s*number\s*is\s*(\d+)/i;
      const match3 = question.match(reversePattern);
      if (match3) {
        const num = parseInt(match3[1]);
        const den = parseInt(match3[2]);
        const result = parseInt(match3[3]);
        return (result * den) / num;
      }

      // Handle "a/b of what number is/equals C?" -> C * b / a
      const reversePattern2 = /(\d+)\s*\/\s*(\d+)\s*of\s*(?:what|which)\s*number\s*(?:is|equals|=)\s*(\d+)/i;
      const match4 = question.match(reversePattern2);
      if (match4) {
        const num = parseInt(match4[1]);
        const den = parseInt(match4[2]);
        const result = parseInt(match4[3]);
        return (result * den) / num;
      }
      
      // Fallback: look for any numbers
      const numbers = question.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        return parseInt(numbers[0]) / parseInt(numbers[1]);
      }
    }

    // Handle other operations with the pattern
    const pattern = patterns[op];
    if (pattern) {
      const match = question.match(pattern);
      if (match) {
        const a = parseFloat(match[1]);
        const b = parseFloat(match[2]);
        switch (op) {
          case 'addition': return Math.round((a + b) * 100) / 100;
          case 'subtraction': return Math.round((a - b) * 100) / 100;
          case 'multiplication': return Math.round((a * b) * 100) / 100;
          case 'division': return Math.round((a / b) * 100) / 100;
          case 'decimals': {
            // Detect actual operator in the question
            if (question.match(/\d\s*[×x]\s*\d/)) return Math.round((a * b) * 100) / 100;
            if (question.match(/\d\s*[÷/]\s*\d/)) return Math.round((a / b) * 100) / 100;
            if (question.match(/\d\s*-\s*\d/)) return Math.round((a - b) * 100) / 100;
            return Math.round((a + b) * 100) / 100; // default to addition
          }
          default: return null;
        }
      }
    }

    // For story problems, look for "how many" or similar
    const numbers = question.match(/\d+(?:\.\d+)?/g);
    if (numbers && numbers.length >= 2) {
      const nums = numbers.map(n => parseFloat(n));
      switch (op) {
        case 'addition': return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
        case 'subtraction': return Math.round(nums.slice(1).reduce((a, b) => a - b, nums[0]) * 100) / 100;
        case 'multiplication': return Math.round(nums.reduce((a, b) => a * b, 1) * 100) / 100;
        case 'division': return Math.round((nums[0] / nums[nums.length - 1]) * 100) / 100;
        case 'decimals': {
          // Detect actual operator in the question
          if (question.match(/\d\s*[×x]\s*\d/)) return Math.round(nums.reduce((a, b) => a * b, 1) * 100) / 100;
          if (question.match(/\d\s*[÷/]\s*\d/)) return Math.round((nums[0] / nums[nums.length - 1]) * 100) / 100;
          if (question.match(/\d\s*-\s*\d/)) return Math.round(nums.slice(1).reduce((a, b) => a - b, nums[0]) * 100) / 100;
          return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100; // default to addition
        }
        default: return null;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isCorrect !== null) return; // debounce & prevent double submit
    setIsSubmitting(true);
    
    try {
    // Check if answer was extracted successfully
    if (correctAnswer === null) {
      setFeedback('❌ Unable to extract answer from this question. Please try the next question.');
      setIsCorrect(false);
      return;
    }
    
    // Handle different answer types based on operation
    let correct = false;
    let userVal = userAnswer;
    
    if (operation === 'logic_patterns' || operation === 'logic_patterns_problem') {
      // For logic patterns, compare as strings (case-insensitive)
      if (correctAnswer && typeof correctAnswer === 'string') {
        correct = userVal.toString().trim().toUpperCase() === correctAnswer.toString().toUpperCase();
      } else if (correctAnswer !== null) {
        // If correctAnswer is numeric for logic patterns, allow flexible matching
        correct = userVal.toString().trim().toUpperCase() === correctAnswer.toString().toUpperCase();
      }
    } else {
      // Parse user answer — supports fractions like "1/2", mixed numbers like "1 1/2", and decimals
      const parsedUserVal = parseFractionInput(userAnswer);
      userVal = parsedUserVal;
      
      if (isNaN(parsedUserVal)) {
        setFeedback('❌ Please enter a valid number (e.g. 42, 0.5, or 1/2).');
        setIsCorrect(false);
        return;
      }
      
      // Handle floating point comparison with small tolerance for rounding errors
      correct = Math.abs(parsedUserVal - correctAnswer) < 0.01 || parsedUserVal === correctAnswer;
    }
    
    setIsCorrect(correct);
    
    // Update streak
    const newStreak = correct ? currentStreak + 1 : 0;
    setCurrentStreak(newStreak);
    
    if (correct) {
      setFeedback('🎉 Correct! Amazing!');
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    } else {
      const explanation = getExplanation(operation, question, correctAnswer);
      setFeedback(`❌ Not quite. The answer is ${correctAnswer}.\n${explanation}`);
    }

    // Update session statistics
    const newTotal = sessionStats.total + 1;
    const newCorrect = correct ? sessionStats.correct + 1 : sessionStats.correct;
    const newDifficulty = calculateDifficulty(newCorrect, newTotal);
    
    setSessionStats({
      correct: newCorrect,
      total: newTotal,
      difficulty: newDifficulty,
    });
    
    setQuestionsInSession(questionsInSession + 1);

    // Track missed questions for test summary
    if (!correct) {
      setMissedQuestions(prev => [...prev, {
        question,
        yourAnswer: userVal,
        correctAnswer,
        operation,
      }]);
    }

    // Award XP
    try {
      const xpResult = await awardXP(userId, {
        correct,
        streak: correct ? newStreak : 0,
        difficulty: newDifficulty,
      });

      if (xpResult.xpEarned > 0) {
        setSessionXP(prev => prev + xpResult.xpEarned);
        setXpEarnedPopup({
          xp: xpResult.xpEarned,
          streak: newStreak,
          leveledUp: xpResult.leveledUp,
          newLevel: xpResult.level,
        });
        setTimeout(() => setXpEarnedPopup(null), 2200);

        // Level up notification
        if (xpResult.leveledUp) {
          setNewLevelInfo({ level: xpResult.level, title: getLevelTitle(xpResult.level) });
          setShowLevelUp(true);
          setTimeout(() => setShowLevelUp(false), 3500);
        }
      }

      // Notify parent of XP changes
      if (onXPUpdate) onXPUpdate(xpResult);
    } catch (error) {
      console.error('Error awarding XP:', error);
    }

    // Save to database
    try {
      await saveAnswer(userId, {
        question,
        operation,
        userAnswer: userVal,
        correctAnswer,
        correct,
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }

    // Auto-advance after correct answer (play mode only)
    if (correct && mode === 'play') {
      autoAdvanceRef.current = setTimeout(() => {
        handleNextQuestion();
      }, AUTO_ADVANCE_DELAY);
    }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    // Clear any pending auto-advance
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    // In test mode, check if we've reached the question limit
    if (mode === 'test' && sessionStats.total >= TEST_QUESTION_COUNT) {
      clearInterval(timerRef.current);
      setShowSummary(true);
      return;
    }
    setUserAnswer('');
    setIsCorrect(null);
    setFeedback('');
    setShowHint(false);
    setShowCelebration(false);
    setXpEarnedPopup(null);
    loadQuestion();
    if (onNext) onNext();
  };

  const calculateDifficulty = (correct, total) => {
    const result = calculateGradeAwareDifficulty(correct, total, userGrade);
    return result.difficulty;
  };

  const getHintForOperation = (op, q) => {
    const hints = {
      addition: [
        'Break big numbers into tens and ones, then add each part separately.',
        'Try adding the ones digits first, then the tens.',
        'Line up the numbers by place value and add column by column.',
      ],
      subtraction: [
        'Try counting up from the smaller number to the larger one.',
        'Break the problem into smaller steps — subtract the ones first, then the tens.',
        'If the top digit is smaller, you may need to borrow from the next column.',
      ],
      multiplication: [
        'Multiplication is repeated addition. For example, 4 × 3 = 4 + 4 + 4.',
        'Break one number into parts: 12 × 5 = (10 × 5) + (2 × 5).',
        'Look for patterns in your times tables to help.',
      ],
      division: [
        'Division is the opposite of multiplication. Think: what times the divisor gives the dividend?',
        'Try estimating first — is the answer closer to 5 or 50?',
        'Break the dividend into friendly parts that divide evenly.',
      ],
      fractions: [
        'To add fractions, make sure the denominators (bottom numbers) are the same first.',
        'Remember: "of" means multiply. So 1/3 of 12 = (1/3) × 12.',
        'To simplify a fraction, divide top and bottom by the same number.',
      ],
      decimals: [
        'Line up the decimal points before adding or subtracting.',
        'When multiplying decimals, count total decimal places in both numbers.',
        'Think of decimals as money — 0.5 is like 50 cents.',
      ],
      algebra: [
        'To solve for x, do the same operation to both sides of the equation.',
        'Work backwards: if 2x + 5 = 13, first subtract 5, then divide by 2.',
        'Replace the variable with your answer to check if both sides are equal.',
      ],
      geometry: [
        'Area of a rectangle = length × width. Perimeter = 2 × (length + width).',
        'Area of a triangle = (base × height) ÷ 2.',
        'For circles: circumference = π × diameter, area = π × radius².',
      ],
      statistics: [
        'Mean = sum of all values ÷ number of values.',
        'Median is the middle value when numbers are sorted in order.',
        'Probability = favorable outcomes ÷ total possible outcomes.',
      ],
      calculus: [
        'The derivative of xⁿ is n × xⁿ⁻¹ (power rule).',
        'A derivative tells you the rate of change — how fast something changes.',
        'For limits, try plugging the value directly into the expression first.',
      ],
      logic_patterns: [
        'Look at the differences between consecutive numbers — is there a pattern?',
        'Check if each number is multiplied by the same value (geometric pattern).',
        'Try checking if each number is the sum of the two before it (like Fibonacci).',
      ],
    };

    const opHints = hints[op] || hints.addition;
    return opHints[Math.floor(Math.random() * opHints.length)];
  };

  const getExplanation = (op, q, answer) => {
    const explanations = {
      addition: `Tip: Add numbers step by step. Break large numbers into tens and ones.`,
      subtraction: `Tip: Subtract by counting up from the smaller number, or break into parts.`,
      multiplication: `Tip: Multiplication is repeated addition. You can also break numbers into parts: e.g. 12×5 = (10×5)+(2×5).`,
      division: `Tip: Think "what number times the divisor gives the dividend?" Division is the reverse of multiplication.`,
      fractions: `Tip: For fraction operations, find a common denominator first. "Of" means multiply: a/b of X = (a×X)/b.`,
      decimals: `Tip: Line up decimal points for +/−. For ×, multiply as whole numbers then count decimal places.`,
      algebra: `Tip: Isolate the variable by doing the same operation to both sides. Work backwards from the result.`,
      geometry: `Tip: Rectangle area = l×w, triangle = ½×b×h, circle = π×r². Perimeter = sum of all sides.`,
      statistics: `Tip: Mean = sum÷count. Median = middle value when sorted. Probability = favorable÷total outcomes.`,
      calculus: `Tip: Power rule: d/dx(xⁿ) = n·xⁿ⁻¹. For limits, try direct substitution first.`,
      logic_patterns: `Tip: Check differences between terms (arithmetic), ratios (geometric), or sums of previous terms (Fibonacci-like).`,
    };
    return explanations[op] || 'Tip: Review the question carefully and try breaking it into smaller steps.';
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play Mode Summary Screen
  if (showPlaySummary) {
    const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    const emoji = pct >= 80 ? '🌟' : pct >= 60 ? '👍' : pct >= 40 ? '💪' : '📚';

    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl p-6 shadow-xl animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{emoji} Session Complete!</h2>
          <p className="text-gray-500">Great practice session — here's your recap</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-violet-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-violet-600">{sessionStats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Questions</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{sessionStats.correct}</p>
            <p className="text-xs text-gray-500 mt-1">Correct</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{pct}%</p>
            <p className="text-xs text-gray-500 mt-1">Accuracy</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">+{sessionXP}</p>
            <p className="text-xs text-gray-500 mt-1">XP Earned</p>
          </div>
        </div>

        {missedQuestions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">❌ Questions to Review ({missedQuestions.length})</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {missedQuestions.map((mq, i) => (
                <div key={i} className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg text-sm">
                  <p className="font-semibold text-gray-800 mb-1">{mq.question}</p>
                  <p className="text-red-600">Your answer: {mq.yourAnswer}</p>
                  <p className="text-green-600">Correct answer: {mq.correctAnswer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {missedQuestions.length === 0 && sessionStats.total > 0 && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6 text-center">
            <p className="text-lg font-bold text-green-700">🎉 All correct! Outstanding!</p>
          </div>
        )}

        <button
          onClick={onEndSession}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3 min-h-[44px] rounded-lg hover:shadow-lg transform hover:scale-105 transition"
        >
          ← Back to Modules
        </button>
      </div>
    );
  }

  // Test Summary Screen
  if (showSummary) {
    const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
    const gradeColor = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl p-6 shadow-xl animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📝 Test Complete!</h2>
          <p className="text-gray-500">Here's how you did</p>
        </div>

        {/* Score Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-violet-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-violet-600">{sessionStats.correct}/{sessionStats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Correct</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${gradeColor}`}>{grade}</p>
            <p className="text-xs text-gray-500 mt-1">{pct}%</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{formatTime(elapsedTime)}</p>
            <p className="text-xs text-gray-500 mt-1">Time</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">+{sessionXP}</p>
            <p className="text-xs text-gray-500 mt-1">XP Earned</p>
          </div>
        </div>

        {/* Missed Questions Review */}
        {missedQuestions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">❌ Questions to Review ({missedQuestions.length})</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {missedQuestions.map((mq, i) => (
                <div key={i} className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg text-sm">
                  <p className="font-semibold text-gray-800 mb-1">{mq.question}</p>
                  <p className="text-red-600">Your answer: {mq.yourAnswer}</p>
                  <p className="text-green-600">Correct answer: {mq.correctAnswer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {missedQuestions.length === 0 && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6 text-center">
            <p className="text-lg font-bold text-green-700">🎉 Perfect Score! Amazing work!</p>
          </div>
        )}

        <button
          onClick={onEndSession}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3 min-h-[44px] rounded-lg hover:shadow-lg transform hover:scale-105 transition"
        >
          ← Back to Modules
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 shadow-lg animate-pulse h-96 flex items-center justify-center">
        <p className="text-2xl font-bold text-violet-600">Loading question... 🤔</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 shadow-lg">
      {/* Session Header with Difficulty & End Button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-semibold text-gray-600">
            Operation: <span className="text-violet-600 capitalize">{operation}</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-white text-sm font-bold ${
            sessionStats.difficulty === 'Very Hard' ? 'bg-red-600' :
            sessionStats.difficulty === 'Hard' ? 'bg-orange-600' :
            sessionStats.difficulty === 'Medium' ? 'bg-yellow-600' :
            sessionStats.difficulty === 'Easy' ? 'bg-green-600' :
            'bg-green-500'
          }`}>
            📊 {sessionStats.difficulty}
          </div>
          {/* Streak Counter */}
          {currentStreak >= 2 && (
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-white text-sm font-bold animate-bounce-slow flex items-center gap-1">
              🔥 {currentStreak} streak
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
            if (mode === 'play' && sessionStats.total > 0) {
              setShowPlaySummary(true);
            } else {
              onEndSession();
            }
          }}
          className="px-4 py-2 min-h-[44px] bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition"
          title="End this practice/test session"
        >
          End Session
        </button>
      </div>

      {/* Question Counter */}
      <div className="text-center mb-2 text-sm font-semibold text-gray-600">
        {mode === 'test' ? (
          <div className="flex justify-between items-center">
            <span>Question {Math.min(sessionStats.total + 1, TEST_QUESTION_COUNT)}/{TEST_QUESTION_COUNT}</span>
            <span>✅ {sessionStats.correct}/{sessionStats.total}</span>
            <span>⏱️ {formatTime(elapsedTime)}</span>
          </div>
        ) : (
          <>Questions: {sessionStats.total} | Correct: {sessionStats.correct} ({sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%)</>
        )}
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-violet-300">
        <h2 className="text-xl font-bold text-gray-800 text-center">{question}</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Your Answer:</label>
          <input
            type="text"
            inputMode={operation === 'logic_patterns' || operation === 'logic_patterns_problem' ? 'text' : 'decimal'}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder={operation === 'logic_patterns' || operation === 'logic_patterns_problem' ? 'Enter letter (A, B, C, etc)' : 'Enter your answer (e.g. 42 or 0.5)'}
            className="w-full p-3 border-2 border-violet-400 rounded-lg text-lg font-semibold focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 transition disabled:opacity-50 disabled:bg-gray-100"
            disabled={isCorrect !== null}
            autoFocus
          />
        </div>

        {/* Hint Button */}
        {isCorrect === null && (
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="text-sm text-violet-600 hover:text-violet-800 font-semibold underline"
          >
            {showHint ? '✅ Hint Shown' : '? Need a hint?'}
          </button>
        )}

        {/* Hint */}
        {showHint && isCorrect === null && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded text-sm text-gray-700">
            💡 {getHintForOperation(operation, question)}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCorrect !== null || !userAnswer}
          className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold py-3 min-h-[44px] rounded-lg disabled:opacity-50 hover:shadow-lg transform hover:scale-105 transition"
        >
          Submit Answer ✓
        </button>
      </form>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            >
              {['⭐', '🌟', '🎉', '🎊', '💫', '✨'][i % 6]}
            </div>
          ))}
        </div>
      )}

      {/* XP Earned Popup */}
      {xpEarnedPopup && (
        <div className="flex justify-center mt-3 animate-xp-popup">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-lg">
            <span className="text-lg">⚡</span>
            <span>+{xpEarnedPopup.xp} XP</span>
            {xpEarnedPopup.streak >= 3 && (
              <span className="text-xs bg-white bg-opacity-30 rounded-full px-2 py-0.5">
                🔥 {xpEarnedPopup.streak}x
              </span>
            )}
          </div>
        </div>
      )}

      {/* Level Up Overlay */}
      {showLevelUp && newLevelInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center animate-level-up border-4 border-amber-400 max-w-sm mx-4">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Level Up!</h2>
            <p className="text-4xl font-bold text-violet-600 mb-2">Level {newLevelInfo.level}</p>
            <p className="text-lg text-amber-600 font-semibold">{newLevelInfo.title}</p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`mt-4 p-4 rounded-lg font-bold animate-slide-in ${
          isCorrect 
            ? 'bg-green-100 text-green-700 border-2 border-green-400 text-center text-lg' 
            : 'bg-red-100 text-red-700 border-2 border-red-400'
        }`}>
          {isCorrect ? (
            feedback
          ) : (
            <>
              <p className="text-lg text-center">{feedback.split('\n')[0]}</p>
              <p className="text-sm font-medium mt-2 text-red-600 opacity-80">{feedback.split('\n')[1]}</p>
            </>
          )}
        </div>
      )}

      {/* Auto-advance indicator (play mode, correct answer) */}
      {isCorrect === true && mode === 'play' && (
        <div className="mt-2 text-center text-sm text-gray-400 font-medium animate-pulse">
          Next question in a moment...
        </div>
      )}

      {/* Next Button */}
      {isCorrect !== null && (
        <button
          onClick={handleNextQuestion}
          className="w-full mt-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-3 min-h-[44px] rounded-lg hover:shadow-lg transform hover:scale-105 transition"
        >
          {isCorrect && mode === 'play' ? 'Skip Ahead →' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}
