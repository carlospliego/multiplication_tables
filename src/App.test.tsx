import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { App } from './App';

it('renders the game title', () => {
  render(<App />);
  expect(screen.getByText('Times Table Rocket')).toBeInTheDocument();
});
