import { useEffect, useRef } from 'react';
import styles from './NumberPad.module.css';

export interface NumberPadProps {
  value: string;
  onChange(v: string): void;
  onSubmit(): void;
  maxDigits?: number;
  disabled?: boolean;
  captureKeyboard?: boolean;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function NumberPad({
  value,
  onChange,
  onSubmit,
  maxDigits = 2,
  disabled = false,
  captureKeyboard = true,
}: NumberPadProps) {
  const latest = useRef({ value, onChange, onSubmit, maxDigits, disabled });
  latest.current = { value, onChange, onSubmit, maxDigits, disabled };

  const digit = (d: string) => {
    const p = latest.current;
    if (p.disabled || p.value.length >= p.maxDigits) return;
    p.onChange(p.value + d);
  };
  const del = () => {
    const p = latest.current;
    if (p.disabled || p.value.length === 0) return;
    p.onChange(p.value.slice(0, -1));
  };
  const go = () => {
    const p = latest.current;
    if (p.disabled || p.value.length === 0) return;
    p.onSubmit();
  };

  useEffect(() => {
    if (!captureKeyboard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as Element | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (latest.current.disabled) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        digit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        del();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [captureKeyboard]);

  return (
    <div className={styles.pad} role="group" aria-label="Number pad">
      {ROWS.flat().map((d) => (
        <button
          key={d}
          type="button"
          className={styles.key}
          disabled={disabled}
          onClick={() => digit(d)}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        className={`${styles.key} ${styles.delete}`}
        aria-label="Delete"
        disabled={disabled}
        onClick={del}
      >
        ⌫
      </button>
      <button type="button" className={styles.key} disabled={disabled} onClick={() => digit('0')}>
        0
      </button>
      <button
        type="button"
        className={`${styles.key} ${styles.go}`}
        aria-label="Go"
        disabled={disabled || value.length === 0}
        onClick={go}
      >
        GO
      </button>
    </div>
  );
}
