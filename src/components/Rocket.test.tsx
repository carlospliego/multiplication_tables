import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rocket } from './Rocket';
import { Planet } from './Planet';
import { Asteroid } from './Asteroid';
import { Alien } from './Alien';
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

describe('fix round 1', () => {
  it('gives each Planet instance a unique clipPath id', () => {
    const { container } = render(<><Planet planet={3} state="open" /><Planet planet={3} state="open" /></>);
    const ids = [...container.querySelectorAll('clipPath')].map((c) => c.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });
  it('never emits "undefined" in a Planet class', () => {
    const { container } = render(<Planet planet={1} state="locked" />);
    expect(container.querySelector('svg')!.getAttribute('class')).not.toContain('undefined');
  });
  it('renders the Alien silhouette differently', () => {
    const a = render(<Alien planet={2} />).container.innerHTML;
    const b = render(<Alien planet={2} silhouette />).container.innerHTML;
    expect(a).not.toBe(b);
    expect(b).toContain('data-silhouette="true"');
    expect(b).not.toContain('circle cx="38"');
  });
  it('keeps the cockpit window above Golden Paint', () => {
    const { container } = render(<Rocket parts={['Golden Paint', 'Bubble Cockpit']} />);
    const html = container.innerHTML;
    expect(html.indexOf('data-part="Golden Paint"')).toBeLessThan(html.indexOf('data-part="Bubble Cockpit"'));
  });
});
