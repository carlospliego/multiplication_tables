import { useEffect, useRef, useState } from 'react';
import { Asteroid } from '../components/Asteroid';
import { QuestionCard, type AnswerResult } from '../components/QuestionCard';
import { RepairScreen } from '../components/RepairScreen';
import { BOSS_SHIELD, nextBossQuestion, recordBossAnswer, startBoss } from '../engine/boss';
import type { AnswerInput, FactId, Facts, PlanetId, Question, Rng } from '../engine/types';
import styles from './BossScreen.module.css';

export const BOSS_FEEDBACK_MS = 700;

export interface BossScreenProps {
  planet: PlanetId;
  facts: Facts;
  rng: Rng;
  onAnswer(factId: FactId, ans: AnswerInput, activeSeconds: number): void;
  onFinish(result: 'won' | 'retreated'): void;
}

export function BossScreen({ planet, facts, rng, onAnswer, onFinish }: BossScreenProps) {
  const [run, setRun] = useState(() => startBoss(planet));
  const [q, setQ] = useState<Question>(() => nextBossQuestion(facts, startBoss(planet), rng));
  const [zapping, setZapping] = useState(false);
  const [repair, setRepair] = useState<Question | null>(null);
  const lastAt = useRef(performance.now());
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleAnswer = (r: AnswerResult) => {
    if (zapping || run.status !== 'fighting') return;
    const now = performance.now();
    const raw = (now - lastAt.current) / 1000;
    const activeSeconds = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    lastAt.current = now;
    onAnswer(q.factId, { correct: r.correct, responseMs: r.responseMs, interrupted: r.interrupted }, activeSeconds);
    const next = recordBossAnswer(run, q.factId, r.correct);
    setRun(next);
    if (next.status === 'fighting') setQ(nextBossQuestion(facts, next, rng));
    if (r.correct) {
      setZapping(true);
      timer.current = setTimeout(() => {
        timer.current = null;
        setZapping(false);
      }, BOSS_FEEDBACK_MS);
    } else {
      setRepair(q);
    }
  };

  const finish = () => {
    if (finished.current || run.status === 'fighting') return;
    finished.current = true;
    onFinish(run.status);
  };

  const over = run.status !== 'fighting';
  const showEnd = over && !zapping && !repair;

  let content: React.ReactNode = null;
  if (showEnd) {
    content = (
      <div className={styles.end}>
        {run.status === 'won' ? (
          <>
            <h2 className={styles.endTitle}>Planet freed!</h2>
            <p className={styles.endText}>The asteroid is gone. Great shooting, Captain!</p>
          </>
        ) : (
          <>
            <h2 className={styles.endTitle}>Good fight!</h2>
            <p className={styles.endText}>The asteroid flew off to recharge. It will return, and you will be even stronger!</p>
          </>
        )}
        <button type="button" className={styles.go} onClick={finish}>Continue</button>
      </div>
    );
  } else if (zapping) {
    content = <div className={styles.feedback}><p className={styles.zap} role="status">Zap!</p></div>;
  } else if (repair) {
    content = <RepairScreen question={repair} onDone={() => setRepair(null)} />;
  } else if (!over) {
    content = <QuestionCard key={`${run.asked}-${q.factId}`} question={q} onAnswer={handleAnswer} />;
  }

  return (
    <div className={styles.screen}>
      <div className={styles.arena}>
        <div className={run.status === 'won' && !zapping ? styles.explode : undefined}>
          <Asteroid shield={run.shield} max={BOSS_SHIELD} label={`Shield ${run.shield} of ${BOSS_SHIELD}`} />
        </div>
        {zapping && <div className={styles.laser} aria-hidden="true" />}
      </div>
      {content}
    </div>
  );
}
