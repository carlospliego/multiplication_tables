import { useState, type FormEvent } from 'react';
import { useGame } from '../state/GameContext';
import styles from './Welcome.module.css';

export function Welcome() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 16;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    dispatch({ type: 'createCaptain', name: trimmed, nowIso: new Date().toISOString() });
  };

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Times Table Rocket</h1>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} htmlFor="captain-name">What's your name, Captain?</label>
        <input
          id="captain-name"
          className={styles.input}
          type="text"
          maxLength={16}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className={styles.launch} disabled={!valid}>Launch!</button>
      </form>
      <p className={styles.tip}>Tip: use Add to Home Screen so your progress stays safe.</p>
    </main>
  );
}
