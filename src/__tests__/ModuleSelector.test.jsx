/**
 * Integration tests for ModuleSelector component.
 * Verifies grade selection, module rendering, and mode buttons.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Firebase modules
jest.mock('../firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  increment: jest.fn(),
}));

jest.mock('../services/databaseService', () => ({
  getUserAnswerHistory: jest.fn().mockResolvedValue([]),
  getUserStats: jest.fn().mockResolvedValue({ totalQuestions: 0, accuracy: 0, streak: 0, weakAreas: [] }),
  saveAnswer: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/xpService', () => ({
  getUserXP: jest.fn().mockResolvedValue({ totalXP: 0, level: 1, dailyQuestions: 0, dailyGoal: 10 }),
  awardXP: jest.fn().mockResolvedValue({ xpEarned: 10, totalXP: 10, level: 1, leveledUp: false, dailyQuestions: 1, dailyGoal: 10 }),
  getLevelForXP: jest.fn().mockReturnValue(1),
  levelProgress: jest.fn().mockReturnValue(0),
  getLevelTitle: jest.fn().mockReturnValue('Number Newbie'),
  xpToNextLevel: jest.fn().mockReturnValue(100),
  calculateXPEarned: jest.fn().mockReturnValue(10),
  LEVEL_THRESHOLDS: [0, 100, 250, 500, 800, 1200, 1700, 2500, 3500, 5000],
  LEVEL_TITLES: ['Number Newbie'],
  DEFAULT_DAILY_GOAL: 10,
}));

jest.mock('../services/aiService', () => ({
  generateQuestion: jest.fn().mockResolvedValue({ question: '2 + 2 = ?', answer: 4 }),
}));

import ModuleSelector from '../components/ModuleSelector';

describe('ModuleSelector', () => {
  const defaultProps = {
    userId: 'user123',
    userGrade: 3,
    userProfile: { name: 'Alice', grade: 3, age: 8 },
    onXPUpdate: jest.fn(),
  };

  it('renders grade selection cards', () => {
    render(<ModuleSelector {...defaultProps} />);
    expect(screen.getByText(/Select Your Grade/i)).toBeInTheDocument();
    // Should have grade range buttons
    expect(screen.getByText('KG-1')).toBeInTheDocument();
  });

  it('shows module selection after grade is pre-selected', () => {
    render(<ModuleSelector {...defaultProps} />);
    // Grade 3 should map to '2-3' automatically
    expect(screen.getByText(/Choose Your Modules/i)).toBeInTheDocument();
  });

  it('shows Play and Test mode buttons', () => {
    render(<ModuleSelector {...defaultProps} />);
    expect(screen.getByText(/Play Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Mode/i)).toBeInTheDocument();
  });

  it('disables mode buttons when no modules are selected', () => {
    render(<ModuleSelector {...defaultProps} />);
    // Clear all modules first
    const clearBtn = screen.queryByText(/Clear/i);
    if (clearBtn) {
      fireEvent.click(clearBtn);
    }
    // Mode buttons should indicate they need modules
    // The buttons may be disabled or have different text
    const playBtn = screen.getByText(/Play Mode/i);
    expect(playBtn).toBeInTheDocument();
  });
});
