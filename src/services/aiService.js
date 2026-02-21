import axios from 'axios';
import { getRandomTopicByGrade, mathModulesByGrade } from '../data/mathModules';

/**
 * Generate a question. Always returns { question: string, answer: number|string|null }
 * - AI path: returns both question and answer from GPT
 * - Fallback path: returns question only (answer = null, caller must compute)
 */
const generateQuestion = async (userHistory, userGrade, operation, selectedModules = []) => {
  // List of operations that benefit from AI generation (more variety, better contextuality)
  const aiPreferredOperations = ['logic_patterns', 'algebra', 'geometry', 'statistics', 'calculus', 'fractions', 'decimals'];
  const isAiPreferred = aiPreferredOperations.includes(operation);
  
  // If specific modules are selected, always use AI to ensure module-specific questions
  if (selectedModules && selectedModules.length > 0 && process.env.REACT_APP_OPENAI_API_KEY) {
    return generateAIQuestion(userHistory, userGrade, operation, selectedModules, isAiPreferred);
  }
  
  // For AI-preferred operations, use AI 90% of the time (increased from 70%)
  // For other operations, use AI 70% of the time
  const aiProbability = isAiPreferred ? 0.9 : 0.7;
  if (process.env.REACT_APP_OPENAI_API_KEY && Math.random() < aiProbability) {
    return generateAIQuestion(userHistory, userGrade, operation, selectedModules, isAiPreferred);
  }
  
  // Fallback to rule-based generation (answer computed by caller)
  const fallbackQ = generateFallbackQuestion(operation, userGrade);
  return { question: fallbackQ, answer: null };
};

/**
 * Get a random topic from selected modules
 * Falls back to random topic by grade if no modules selected
 */
const getTopicFromSelectedModules = (userGrade, selectedModules) => {
  if (!selectedModules || selectedModules.length === 0) {
    return getRandomTopicByGrade(userGrade);
  }
  
  const gradeData = mathModulesByGrade[userGrade];
  
  if (!gradeData || !gradeData.modules) {
    return getRandomTopicByGrade(userGrade);
  }
  
  // Collect all topics from selected modules
  const topicsFromSelectedModules = [];
  gradeData.modules.forEach(module => {
    if (selectedModules.includes(module.name)) {
      topicsFromSelectedModules.push(...module.topics);
    }
  });
  
  // Return random topic from selected modules, or fallback
  if (topicsFromSelectedModules.length > 0) {
    return topicsFromSelectedModules[Math.floor(Math.random() * topicsFromSelectedModules.length)];
  }
  
  return getRandomTopicByGrade(userGrade);
};

/**
 * Generate AI question using OpenAI API
 * Incorporates grade-specific topics and complexity assessment
 * Uses topics from selected modules if available
 */
const generateAIQuestion = async (userHistory, userGrade, operation, selectedModules = [], isAiPreferred = false) => {
  try {
    const relevantTopic = getTopicFromSelectedModules(userGrade, selectedModules);
    
    // Determine complexity based on user performance
    let complexityLevel = 'medium';
    if (userHistory && userHistory.length > 0) {
      const recentAccuracy = userHistory.slice(-10).reduce((sum, h) => sum + (h.correct ? 1 : 0), 0) / Math.min(10, userHistory.length);
      if (recentAccuracy > 0.85) complexityLevel = 'hard';
      else if (recentAccuracy > 0.70) complexityLevel = 'medium';
      else complexityLevel = 'easy';
    }

    // Build module context string
    const moduleContext = selectedModules && selectedModules.length > 0 
      ? `Selected modules: ${selectedModules.join(', ')}\n`
      : '';

    // Determine the question type based on operation and modules
    let questionTypeGuidance = '';
    const hasLogicPatterns = selectedModules && selectedModules.some(m => m.includes('Logic & Patterns'));
    
    if (hasLogicPatterns || operation === 'logic_patterns' || operation === 'logic_patterns_problem') {
      questionTypeGuidance = `QUESTION TYPE: Logic & Patterns - Generate UNIQUE pattern/sequence questions.
VARIETY: Use different types each time:
- Number sequences (arithmetic, geometric, Fibonacci-like)
- Letter sequences (alphabetical, skipping patterns)
- Mixed alphanumeric patterns (1A, 2B, etc.)
- Visual/shape patterns descriptions
- Logical reasoning puzzles
- Alternating patterns
Examples: "What comes next: 2, 4, 6, 8, ___?", "Find the pattern: 1, 1, 2, 3, 5, 8, ___?", "Identify: A, C, E, G, ___?"
CRITICAL: Each question must be DIFFERENT from previous ones. Focus on pattern recognition, NOT simple arithmetic.`;
    } else if (operation === 'algebra' || operation === 'algebra_problem') {
      questionTypeGuidance = `QUESTION TYPE: Algebra - Generate UNIQUE algebraic equations and expressions.
VARIETY: Use different structures each time:
- Linear equations (2x + 5 = 13, 3x - 7 = 8)
- Variable relationships (If y = 2x and x = 5, what is y?)
- Expression simplification (4x + 2x, 5a - 2a + 3a)
- Multi-step equations
- Word problems with variables
Examples: "If 2x + 5 = 13, what is x?", "Simplify: 3x + 2x", "If y = 2x and x = 5, what is y?"
CRITICAL: Do NOT generate simple arithmetic. Must involve variables or algebraic thinking.`;
    } else if (operation === 'geometry' || operation === 'geometry_problem') {
      questionTypeGuidance = `QUESTION TYPE: Geometry - Generate UNIQUE geometric problems.
VARIETY: Use different concepts each time:
- Area calculations (rectangles, triangles, circles, squares)
- Perimeter and circumference
- Volume calculations
- Angle relationships
- Coordinate geometry
- 3D shapes
Examples: "What is the area of a rectangle 8cm × 5cm?", "If a square has area 36, what is its perimeter?", "A triangle has base 10cm and height 6cm. What is its area?"
CRITICAL: Do NOT generate simple arithmetic. Must involve geometric concepts.`;
    } else if (operation === 'statistics' || operation === 'statistics_problem') {
      questionTypeGuidance = `QUESTION TYPE: Statistics & Probability - Generate UNIQUE statistical problems.
VARIETY: Use different concepts each time:
- Mean, median, mode, range
- Probability (dice, coins, cards, combinations)
- Data interpretation
- Distribution analysis
- Conditional probability
Examples: "If a die is rolled, what is the probability of getting a 3?", "What is the mean of 2, 4, 6, 8?", "What is the median of 3, 5, 7, 9, 11?"
CRITICAL: Do NOT generate simple arithmetic. Must involve statistical thinking.`;
    } else if (operation === 'calculus' || operation === 'calculus_problem') {
      questionTypeGuidance = `QUESTION TYPE: Calculus - Generate UNIQUE calculus concepts.
VARIETY: Use different techniques each time:
- Derivatives (power rule, chain rule)
- Limits
- Integration
- Rates of change
- Critical points
Examples: "What is the derivative of x²?", "Find the limit as x approaches 2 of (x + 1)", "What is the derivative of 3x² + 2x?"
CRITICAL: Do NOT generate simple arithmetic. Must involve calculus concepts.`;
    } else if (operation === 'fractions' || operation === 'fractions_problem') {
      questionTypeGuidance = `QUESTION TYPE: Fractions - Generate UNIQUE fraction problems.
VARIETY: Use different operations each time:
- Addition of fractions (1/4 + 1/4, 1/2 + 1/3)
- Subtraction of fractions
- Multiplication/Division of fractions
- Simplification (4/8, 6/12)
- Finding fractions of numbers (1/3 of 30)
- Word problems with fractions
Examples: "What is 1/4 + 1/4?", "What is 2/3 of 18?", "Simplify: 4/8"
CRITICAL: Focus on fractions, not basic arithmetic with whole numbers.`;
    } else if (operation === 'decimals' || operation === 'decimals_problem') {
      questionTypeGuidance = `QUESTION TYPE: Decimals - Generate UNIQUE decimal problems.
VARIETY: Use different operations each time:
- Addition of decimals (2.5 + 1.3)
- Subtraction of decimals
- Multiplication of decimals
- Division of decimals
- Decimal to fraction conversion
- Real-world decimal problems (money, measurements)
Examples: "What is 2.5 + 1.3?", "Multiply: 2.5 × 4", "What is 10.5 ÷ 2?"
CRITICAL: Focus on decimals, not basic arithmetic with whole numbers.`;
    }

    // Add guidance for exponents when the module is selected
    const hasExponents = selectedModules && selectedModules.some(m => m.includes('Exponents'));
    if (hasExponents && !questionTypeGuidance) {
      questionTypeGuidance = `QUESTION TYPE: Exponents & Roots - Generate UNIQUE exponent and root problems.
VARIETY: Use different concepts each time:
- Powers (What is 2⁵?, What is 3⁴?)
- Square roots (What is √144?, √81?)
- Cube roots (What is ∛27?)
- Scientific notation (Express 5000 in scientific notation)
- Exponent rules (Simplify 2³ × 2⁴)
- Negative exponents (What is 2⁻³?)
Examples: "What is 2⁵?", "What is √144?", "Simplify: 3² × 3³", "What is 5⁰?"
CRITICAL: The answer must ALWAYS be a single number. Do NOT generate questions about growth rates or word problems.`;
    }

    const prompt = `Generate a single UNIQUE and FRESH math question for a ${userGrade} grade student STRICTLY based on the selected modules.

${moduleContext}Topic: ${relevantTopic}
Complexity: ${complexityLevel}

${questionTypeGuidance}

CRITICAL REQUIREMENTS:
- MUST focus on the topic: "${relevantTopic}" from modules: ${selectedModules.join(', ')}
- Generate a COMPLETELY NEW and DIFFERENT question (not a variation of common questions)
- Keep it to one sentence maximum
- Make it engaging and age-appropriate for grade ${userGrade}
- NEVER generate: simple arithmetic like "What is X + Y?", "What is X - Y?", "What is X × Y?", "What is X ÷ Y?" with just numbers
- Must be conceptually appropriate for the selected module
- Make the question INTERESTING and VARIED

RESPONSE FORMAT: You MUST respond with a valid JSON object and nothing else.
The JSON must have exactly two keys:
- "question": the question text (string)
- "answer": the correct numeric answer (number). For letter/pattern answers use a string.
Example: {"question": "What is the area of a rectangle with length 8cm and width 5cm?", "answer": 40}
Example: {"question": "What comes next: A, C, E, G, ___?", "answer": "I"}
Do NOT include any text outside the JSON object.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: isAiPreferred ? 0.8 : 0.5,  // Higher temperature for AI-preferred operations = more variety
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const raw = response.data.choices[0].message.content.trim();
    
    // Parse JSON response from AI
    try {
      // Strip markdown code fences if present (```json ... ```)
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.question) {
        return {
          question: parsed.question,
          answer: parsed.answer !== undefined ? parsed.answer : null,
        };
      }
    } catch (parseErr) {
      console.warn('AI response was not valid JSON, using raw text:', raw);
    }
    
    // If JSON parsing failed, return raw text with no answer (fallback will compute)
    return { question: raw, answer: null };
  } catch (error) {
    console.warn('AI generation failed, using fallback:', error.message);
    const fallbackQ = generateFallbackQuestion(operation, userGrade);
    return { question: fallbackQ, answer: null };
  }
};

const generateFallbackQuestion = (operation, grade = '4-5') => {
  // Grade-specific complexity ranges
  const gradeComplexity = {
    'KG-1': { maxNum: 20, maxOp: 10 },
    '2-3': { maxNum: 50, maxOp: 25 },
    '4-5': { maxNum: 100, maxOp: 50 },
    '6-7': { maxNum: 200, maxOp: 100 },
    '7-8': { maxNum: 500, maxOp: 200 },
    '9+': { maxNum: 1000, maxOp: 500 },
  };

  const complexity = gradeComplexity[grade] || gradeComplexity['4-5'];

  const questionsMap = {
    addition: [
      `What is ${Math.floor(Math.random() * complexity.maxNum)} + ${Math.floor(Math.random() * complexity.maxOp)}?`,
      `If you have ${Math.floor(Math.random() * complexity.maxNum)} items and get ${Math.floor(Math.random() * complexity.maxOp)} more, how many do you have?`,
      `${Math.floor(Math.random() * complexity.maxNum)} + ${Math.floor(Math.random() * complexity.maxOp)} = ?`,
      `Add: ${Math.floor(Math.random() * complexity.maxNum / 2)} + ${Math.floor(Math.random() * complexity.maxNum / 2)} + ${Math.floor(Math.random() * complexity.maxNum / 2)}`,
    ],
    subtraction: [
      `What is ${Math.floor(Math.random() * complexity.maxNum)} - ${Math.floor(Math.random() * complexity.maxOp)}?`,
      `If you had ${Math.floor(Math.random() * complexity.maxNum)} items and used ${Math.floor(Math.random() * complexity.maxOp)}, how many are left?`,
      `${Math.floor(Math.random() * complexity.maxNum)} - ${Math.floor(Math.random() * complexity.maxOp)} = ?`,
      `Subtract: ${Math.floor(Math.random() * complexity.maxNum)} - ${Math.floor(Math.random() * complexity.maxNum / 2)}`,
    ],
    multiplication: [
      `What is ${Math.floor(Math.random() * 15) + 2} × ${Math.floor(Math.random() * 15) + 2}?`,
      `If each group has ${Math.floor(Math.random() * 12) + 2} items and there are ${Math.floor(Math.random() * 12) + 2} groups, how many items total?`,
      `${Math.floor(Math.random() * 12) + 1} × ${Math.floor(Math.random() * 12) + 1} = ?`,
      `Multiply: ${Math.floor(Math.random() * 20) + 1} × ${Math.floor(Math.random() * 20) + 1}`,
    ],
    division: [
      `What is ${Math.floor(Math.random() * complexity.maxNum)} ÷ ${Math.floor(Math.random() * 12) + 1}?`,
      `If you split ${Math.floor(Math.random() * complexity.maxNum)} equally among ${Math.floor(Math.random() * 12) + 1} groups, how many in each group?`,
      `${Math.floor(Math.random() * complexity.maxNum)} ÷ ${Math.floor(Math.random() * 12) + 1} = ?`,
      `Divide: ${Math.floor(Math.random() * complexity.maxNum)} ÷ ${Math.floor(Math.random() * 12) + 1}`,
    ],
    fractions: [
      `What is 1/4 + 1/4?`,
      `What is 1/3 of 30?`,
      `If you eat 1/2 of a pizza, how much is left?`,
      `What is 2/5 + 1/5?`,
      `If 1/4 of a number is 25, what is the number?`,
      `Simplify: 4/8`,
      `What is 3/4 - 1/4?`,
      `What is 1/2 + 1/3?`,
      `Simplify: 6/12`,
      `What is 2/3 of 18?`,
      `If 1/5 of a cake is 20g, what is the whole cake?`,
      `What is 3/5 + 1/5?`,
      `Simplify: 5/10`,
      `What is 1/2 of 50?`,
    ],
    decimals: [
      `What is 2.5 + 1.3?`,
      `What is 4.2 - 1.8?`,
      `Multiply: 2.5 × 4`,
      `What is 10.5 ÷ 2?`,
      `Add: 3.14 + 2.86`,
      `What is 5.6 - 2.3?`,
      `Multiply: 1.5 × 2`,
      `What is 7.5 ÷ 3?`,
      `Add: 2.25 + 3.75`,
      `What is 6.4 - 1.2?`,
      `Multiply: 0.5 × 8`,
      `What is 9.6 ÷ 2?`,
      `Add: 1.5 + 2.5 + 3.5`,
      `What is 8.1 - 3.2?`,
    ],
    algebra: [
      `If 2x + 5 = 13, what is x?`,
      `Solve: 3x - 7 = 8`,
      `If y = 2x and x = 5, what is y?`,
      `Simplify: 4x + 2x`,
      `If 5x = 25, what is x?`,
      `Solve: x/2 = 10`,
      `What is x if x + 8 = 15?`,
      `Solve: 2x - 3 = 7`,
      `If 3x = 21, what is x?`,
      `Simplify: 3a + 2a + a`,
      `Solve: 4x + 2 = 18`,
      `If x - 5 = 10, what is x?`,
      `What is y if y = 3x and x = 4?`,
      `Solve: 2x + 4 = 12`,
      `If 6x = 30, what is x?`,
    ],
    geometry: [
      `What is the area of a rectangle with length 8cm and width 5cm?`,
      `If a square has side 6cm, what is its perimeter?`,
      `What is the area of a triangle with base 10cm and height 6cm?`,
      `If a circle has radius 5cm, what is its circumference? (Use π ≈ 3.14)`,
      `A rectangle has area 24cm². If its width is 4cm, what is its length?`,
      `If a square has perimeter 20cm, what is its side length?`,
      `What is the volume of a cube with side 3cm?`,
      `A circle has diameter 10cm. What is its radius?`,
      `What is the area of a square with side 7cm?`,
      `If a rectangle has length 12cm and area 60cm², what is its width?`,
      `A triangle has base 8cm and area 20cm². What is its height?`,
      `What is the perimeter of a rectangle 5cm × 3cm?`,
    ],
    statistics: [
      `If a die is rolled, what is the probability of getting a 3?`,
      `What is the mean of 2, 4, 6, 8?`,
      `If you flip a coin, what is the probability of getting heads?`,
      `What is the median of 3, 5, 7, 9, 11?`,
      `If there are 5 red balls and 3 blue balls in a bag, what is the probability of drawing a red ball?`,
      `What is the mode of 1, 2, 2, 3, 3, 3, 4?`,
      `If a die is rolled, what is the probability of getting an even number?`,
      `What is the mean of 10, 20, 30?`,
      `If you pick a card from a deck, what is the probability of getting a heart?`,
      `What is the range of 5, 8, 12, 3, 9?`,
      `If a die is rolled twice, what is the probability of getting two 6s?`,
      `What is the median of 2, 4, 6, 8, 10?`,
    ],
    calculus: [
      `What is the derivative of x²?`,
      `Find the limit as x approaches 2 of (x + 1)`,
      `What is the derivative of 3x² + 2x?`,
      `Find the integral of 2x`,
      `What is the derivative of 5x³?`,
      `Find the derivative of x² + 3x`,
      `What is the limit as x approaches 1 of (2x + 3)?`,
      `Find the integral of x`,
      `What is the derivative of 4x² - 2x?`,
      `Find the derivative of sin(x)`,
    ],
    logic_patterns: [
      // Number sequences
      `What comes next in the sequence: 2, 4, 6, 8, ___?`,
      `Find the pattern: 1, 1, 2, 3, 5, 8, ___?`,
      `What is the missing number: 5, 10, 15, ___, 25?`,
      `Identify the pattern: 1, 4, 9, 16, ___?`,
      `Find the pattern: 10, 20, 30, 40, ___?`,
      `What comes next: 3, 6, 9, 12, ___?`,
      `Continue the sequence: 2, 5, 10, 17, ___?`,
      `What is the next number: 1, 2, 4, 8, ___?`,
      `Find the pattern: 100, 90, 80, 70, ___?`,
      `What comes next: 1, 3, 5, 7, ___?`,
      `Identify the pattern: 2, 6, 12, 20, ___?`,
      `What is the missing number: 50, 40, 30, 20, ___?`,
      `Find the sequence: 5, 5, 10, 15, 25, ___?`,
      `What comes next: 16, 14, 12, 10, ___?`,
      `Continue: 1, 4, 7, 10, ___?`,
      `Identify the pattern: 2, 4, 8, 16, ___?`,
      `What is the next: 81, 64, 49, 36, ___?`,
      `Find the pattern: 11, 22, 33, 44, ___?`,
      
      // Letter sequences
      `What comes next: A, B, C, D, ___?`,
      `Find the pattern: A, C, E, G, ___?`,
      `What is the missing letter: D, E, F, G, ___?`,
      `Identify the pattern: Z, X, V, T, ___?`,
      `What comes next: B, D, F, H, ___?`,
      `Find the sequence: A, B, B, C, C, C, ___?`,
      `What is the next letter: M, N, O, P, ___?`,
      `Identify the pattern: A, Z, B, Y, C, ___?`,
      `What comes next: F, E, D, C, ___?`,
      `Find the pattern: A, C, F, J, ___?`,
      
      // Shape/symbol patterns
      `What comes next in the pattern: △, ▭, ▲, ▢, ___?`,
      `Find the visual pattern: ●, ●●, ●●●, ___?`,
      
      // Mixed patterns
      `What comes next: 1A, 2B, 3C, 4D, ___?`,
      `Identify the pattern: A1, A2, B2, B3, C3, ___?`,
      `Find the sequence: 5a, 10b, 15c, 20d, ___?`,
      
      // Logic problems
      `If the pattern is multiply by 2: 1, 2, 4, 8, ___?`,
      `If the pattern is add 5 each time: 3, 8, 13, 18, ___?`,
      `If the pattern is subtract 2: 20, 18, 16, 14, ___?`,
      `If the pattern doubles then adds 1: 1, 3, 7, 15, ___?`,
    ],
  };

  const questions = questionsMap[operation] || questionsMap.addition;
  return questions[Math.floor(Math.random() * questions.length)];
};

const getWeakTopics = (history) => {
  if (!history || history.length === 0) return [];
  
  const accuracy = {};
  history.forEach(log => {
    const op = log.operation || 'addition';
    if (!accuracy[op]) accuracy[op] = { correct: 0, total: 0 };
    accuracy[op].total++;
    if (log.correct) accuracy[op].correct++;
  });

  return Object.entries(accuracy)
    .map(([op, data]) => ({ op, rate: data.correct / data.total }))
    .sort((a, b) => a.rate - b.rate)
    .map(item => item.op);
};

export { generateQuestion, getWeakTopics };
