import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FuelGauge } from './FuelGauge';

describe('FuelGauge', () => {
  it('shows a percentage', () => {
    render(<FuelGauge fraction={0.4} />);
    expect(screen.getByText('40%')).toBeInTheDocument();
  });
  it('never drops when the fraction decreases', () => {
    const { rerender } = render(<FuelGauge fraction={0.5} />);
    rerender(<FuelGauge fraction={0.33} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    rerender(<FuelGauge fraction={0.8} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
