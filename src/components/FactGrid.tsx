import { factId } from '../engine/facts';
import type { FactId, Facts, Level } from '../engine/types';
import styles from './FactGrid.module.css';

export const LEVEL_ICON: Record<Level, string> = { 0: '·', 1: '○', 2: '◐', 3: '◑', 4: '◑', 5: '★' };
export const LEVEL_NAME: Record<Level, string> = {
  0: 'New',
  1: 'Learning',
  2: 'Getting there',
  3: 'Solid',
  4: 'Solid',
  5: 'Mastered',
};

const NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const LEGEND: { level: Level; label: string }[] = [
  { level: 0, label: 'New' },
  { level: 1, label: 'Learning' },
  { level: 2, label: 'Getting there' },
  { level: 3, label: 'Solid' },
  { level: 5, label: 'Mastered' },
];

export interface FactGridProps {
  facts: Facts;
  onSelect(id: FactId): void;
  selected?: FactId | null;
}

export function FactGrid({ facts, onSelect, selected = null }: FactGridProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.grid}>
        <caption className={styles.caption}>Fact progress</caption>
        <thead>
          <tr>
            <td className={styles.corner} />
            {NUMS.map((c) => (
              <th key={c} scope="col" className={styles.head}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NUMS.map((r) => (
            <tr key={r}>
              <th scope="row" className={styles.head}>{r}</th>
              {NUMS.map((c) => {
                const id = factId(r, c);
                const level = facts[id]?.level ?? 0;
                return (
                  <td key={c} className={styles.cell}>
                    <button
                      type="button"
                      className={styles.btn}
                      data-level={level}
                      aria-label={`${r} × ${c}: level ${level}`}
                      aria-pressed={selected === id}
                      onClick={() => onSelect(id)}
                    >
                      {LEVEL_ICON[level]}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className={styles.legend} aria-label="Legend">
        {LEGEND.map(({ level, label }) => (
          <li key={level} className={styles.legendItem}>
            <span className={styles.swatch} data-level={level} aria-hidden="true">{LEVEL_ICON[level]}</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
