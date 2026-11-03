import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { parseImport } from '../storage/backup';
import type { SaveData } from '../storage/save';
import { useGame } from '../state/GameContext';
import styles from './Welcome.module.css';

export function Welcome() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');
  const submitted = useRef(false);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [importError, setImportError] = useState(false);
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 16;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitted.current) return;
    submitted.current = true;
    dispatch({ type: 'createCaptain', name: trimmed, nowIso: new Date().toISOString() });
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let text = '';
    try {
      text = await file.text();
    } catch {
      // an unreadable file is treated as invalid
    }
    const parsed = parseImport(text);
    setImportError(parsed === null);
    setPending(parsed);
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
      <section className={styles.restore} aria-label="Restore">
        <label className={styles.restoreLabel}>
          Restore from a backup file
          <input type="file" accept="application/json,.json" className={styles.file} onChange={onPick} />
        </label>
        {importError && (
          <p role="alert" className={styles.error}>
            That file doesn't look like a Times Table Rocket backup. Please try another one.
          </p>
        )}
        {pending && (
          <div className={styles.confirm} role="group" aria-label="Confirm restore">
            <p>{`Restore Captain ${pending.captainName}'s progress?`}</p>
            <div className={styles.row}>
              <button type="button" className={styles.launch} onClick={() => dispatch({ type: 'importSave', save: pending })}>
                Restore
              </button>
              <button type="button" className={styles.cancel} onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>
      <p className={styles.tip}>Tip: use Add to Home Screen so your progress stays safe.</p>
    </main>
  );
}
