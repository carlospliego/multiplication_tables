import { render, screen } from '@testing-library/react';
import { it, expect, beforeEach } from 'vitest';
import { App } from './App';
import { createFreshSave, SAVE_KEY } from './storage/save';

beforeEach(() => localStorage.clear());

it('shows Welcome when there is no save', () => {
  render(<App />);
  expect(screen.getByLabelText(/what's your name/i)).toBeInTheDocument();
});

it('shows the Galaxy Map when placement is done', () => {
  const save = { ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'), placementDone: true };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  render(<App />);
  expect(screen.getByRole('button', { name: /launch mission/i })).toBeInTheDocument();
});
