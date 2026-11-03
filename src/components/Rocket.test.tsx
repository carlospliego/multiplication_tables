import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rocket } from './Rocket';
import { Planet } from './Planet';
import { Asteroid } from './Asteroid';
import { PLANETS } from '../engine/facts';

describe('Rocket', () => {
  it('draws only the earned parts', () => {
    const { container } = render(<Rocket parts={['Racing Fins', 'Wings']} />);
    expect(container.querySelector('[data-part="Racing Fins"]')).not.toBeNull();
    expect(container.querySelector('[data-part="Wings"]')).not.toBeNull();
    expect(container.querySelector('[data-part="Antenna"]')).toBeNull();
  });
  it('has a layer for every planet ship part', () => {
    const { container } = render(<Rocket parts={PLANETS.map((p) => p.shipPart)} />);
    for (const p of PLANETS) expect(container.querySelector(`[data-part="${p.shipPart}"]`)).not.toBeNull();
  });
});

describe('Planet', () => {
  it('has an accessible label with name and state', () => {
    render(<Planet planet={2} state="locked" />);
    expect(screen.getByRole('img', { name: 'Twinara, locked' })).toBeInTheDocument();
  });
});

describe('Asteroid', () => {
  it('draws 12 segments and marks remaining shield', () => {
    const { container } = render(<Asteroid shield={5} max={12} />);
    expect(container.querySelectorAll('[data-seg]')).toHaveLength(12);
    expect(container.querySelectorAll('[data-seg="on"]')).toHaveLength(5);
  });
});
