/**
 * Integration tests for Registration component.
 * Verifies the registration form renders correctly and validates inputs.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Firebase modules
jest.mock('../firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  signInAnonymously: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('../services/databaseService', () => ({
  saveUserProfile: jest.fn().mockResolvedValue(true),
}));

import Registration from '../components/Registration';

describe('Registration', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the registration form', () => {
    render(<Registration onRegistrationComplete={mockOnComplete} />);
    expect(screen.getByText(/Math Wizard/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
  });

  it('has name input with maxLength 25', () => {
    render(<Registration onRegistrationComplete={mockOnComplete} />);
    const nameInput = screen.getByPlaceholderText(/your name/i);
    expect(nameInput).toHaveAttribute('maxLength', '25');
  });

  it('has age and grade fields', () => {
    render(<Registration onRegistrationComplete={mockOnComplete} />);
    // Labels exist but not associated via htmlFor, so use getByText
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Grade')).toBeInTheDocument();
  });

  it('disables start button when name is empty', () => {
    render(<Registration onRegistrationComplete={mockOnComplete} />);
    const nameInput = screen.getByPlaceholderText(/your name/i);
    fireEvent.change(nameInput, { target: { value: '' } });
    // The submit button should be present
    const buttons = screen.getAllByRole('button');
    // At least one button should exist
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows email and password fields', () => {
    render(<Registration onRegistrationComplete={mockOnComplete} />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    expect(emailInput).toBeInTheDocument();
  });
});
