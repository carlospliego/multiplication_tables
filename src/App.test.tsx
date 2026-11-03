import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, beforeEach, vi } from 'vitest';
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

it.each([
  ['Hangar', /crew/i],
  ['Star Map', /stars lit/i],
])('renders the %s screen from the map', async (name, text) => {
  const save = { ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'), placementDone: true };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name }));
  expect(screen.getByText(text)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /back to galaxy/i }));
  expect(screen.getByRole('button', { name: /launch mission/i })).toBeInTheDocument();
});

it('routes Grown-ups to the parent gate and Close back to the map', async () => {
  const save = { ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'), placementDone: true };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /grown-ups/i }));
  expect(screen.getByText(/grown-ups only: what is/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(screen.getByRole('button', { name: /launch mission/i })).toBeInTheDocument();
});

it('renders the parent dashboard for the parent screen', async () => {
  const save = { ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'), placementDone: true };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /grown-ups/i }));
  const m = /what is (\d+) × (\d+)\?/.exec(document.body.textContent ?? '')!;
  for (const d of String(Number(m[1]) * Number(m[2]))) {
    await userEvent.click(screen.getByRole('button', { name: d }));
  }
  await userEvent.click(screen.getByRole('button', { name: 'Go' }));
  expect(screen.getByText('★ 0 / 45')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /back to galaxy/i }));
  expect(screen.getByRole('button', { name: /launch mission/i })).toBeInTheDocument();
});

it('shows a non-blocking banner when storage is unavailable', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  try {
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent("Progress can't be saved on this device.");
    expect(screen.getByLabelText(/what's your name/i)).toBeInTheDocument();
  } finally {
    spy.mockRestore();
  }
});

it('does not show the storage banner when storage works', () => {
  render(<App />);
  expect(screen.queryByText("Progress can't be saved on this device.")).toBeNull();
});

it('reset from the dashboard returns to first launch', async () => {
  const save = { ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'), placementDone: true };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /grown-ups/i }));
  const m = /what is (\d+) × (\d+)\?/.exec(document.body.textContent ?? '')!;
  for (const d of String(Number(m[1]) * Number(m[2]))) {
    await userEvent.click(screen.getByRole('button', { name: d }));
  }
  await userEvent.click(screen.getByRole('button', { name: 'Go' }));
  await userEvent.type(screen.getByLabelText(/type reset/i), 'RESET');
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByLabelText(/what's your name/i)).toBeInTheDocument();
  expect(localStorage.getItem(SAVE_KEY)).toBeNull();
});
