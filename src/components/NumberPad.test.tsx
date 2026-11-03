import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberPad } from './NumberPad';

function Harness(props: {
  onSubmit?: () => void;
  onChange?: (v: string) => void;
  initial?: string;
  disabled?: boolean;
  captureKeyboard?: boolean;
}) {
  const [value, setValue] = useState(props.initial ?? '');
  return (
    <>
      <output data-testid="value">{value}</output>
      <NumberPad
        value={value}
        onChange={(v) => {
          props.onChange?.(v);
          setValue(v);
        }}
        onSubmit={props.onSubmit ?? (() => {})}
        disabled={props.disabled}
        captureKeyboard={props.captureKeyboard}
      />
    </>
  );
}


const val = () => screen.getByTestId('value').textContent;

describe('NumberPad', () => {
  it('tapping 5 then 6 calls onChange with 5 then 56', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: '6' }));
    expect(onChange.mock.calls).toEqual([['5'], ['56']]);
  });

  it('ignores a third digit', async () => {
    const onChange = vi.fn();
    render(<Harness initial="56" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.keyDown(window, { key: '7' });
    expect(onChange).not.toHaveBeenCalled();
    expect(val()).toBe('56');
  });

  it('delete removes the last digit', async () => {
    render(<Harness initial="56" />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(val()).toBe('5');
  });

  it('GO is disabled when value is empty and submits otherwise', async () => {
    const onSubmit = vi.fn();
    const { unmount } = render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
    unmount();
    render(<Harness initial="4" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keyboard 7, Backspace, Enter behave the same', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.keyDown(window, { key: '7' });
    expect(val()).toBe('7');
    fireEvent.keyDown(window, { key: '8' });
    expect(val()).toBe('78');
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(val()).toBe('7');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Enter with empty value does not submit', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disabled blocks all input', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<Harness initial="5" disabled onChange={onChange} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("'0' then '7' yields '07'", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: '0' }));
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    expect(val()).toBe('07');
  });

  it('respects captureKeyboard=false', () => {
    render(<Harness captureKeyboard={false} />);
    fireEvent.keyDown(window, { key: '3' });
    expect(val()).toBe('');
  });

  it('ignores modifier keys and typing in inputs', () => {
    render(
      <>
        <input aria-label="name" />
        <textarea aria-label="notes" />
        <Harness />
      </>,
    );
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    fireEvent.keyDown(window, { key: '3', metaKey: true });
    fireEvent.keyDown(window, { key: '3', altKey: true });
    fireEvent.keyDown(screen.getByLabelText('name'), { key: '3' });
    fireEvent.keyDown(screen.getByLabelText('notes'), { key: '3' });
    expect(val()).toBe('');
  });

  it('preventDefault only for handled keys', () => {
    render(<Harness />);
    expect(fireEvent.keyDown(window, { key: '4' })).toBe(false);
    expect(fireEvent.keyDown(window, { key: 'a' })).toBe(true);
    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(true);
  });

  it('removes the listener on unmount', () => {
    const onChange = vi.fn();
    const { unmount } = render(<Harness onChange={onChange} />);
    unmount();
    fireEvent.keyDown(window, { key: '1' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores repeated key events', () => {
    const onSubmit = vi.fn();
    render(<Harness initial="4" onSubmit={onSubmit} />);
    fireEvent.keyDown(window, { key: 'Enter', repeat: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
