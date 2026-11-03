import { useEffect, useRef, useState } from 'react';
import { QuestionCard, type AnswerResult } from '../components/QuestionCard';
import { DiscoveryCard } from '../components/DiscoveryCard';
import { RepairScreen } from '../components/RepairScreen';
import { Rocket } from '../components/Rocket';
import { FuelGauge } from '../components/FuelGauge';
import { LightningBurst } from '../components/LightningBurst';
import { currentQuestion, fuelFraction, isQuestDone, recordQuestResult, startQuestRun } from '../engine/questRun';
import { isFastAnswer } from '../engine/levels';
import type { AnswerInput, FactId, Question, Rng } from '../engine/types';
import { play } from '../audio/sfx';
import styles from './QuestScreen.module.css';

export const FEEDBACK_MS = 900;
export const WOBBLE_MS = 600;
export const LAUNCH_MS = 1000;
const REDUCED_LAUNCH_MS = 300;

function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export interface QuestScreenProps {
  title: string;
  queue: Question[];
  rng: Rng;
  /** Ship parts earned so far, drawn on the rocket. */
  parts?: readonly string[];
  onAnswer(factId: FactId, ans: AnswerInput, activeSeconds: number): void;
  onComplete(summary: { answered: number; lightning: number }): void;
  onExit(): void;
}

export function QuestScreen({ title, queue, rng, parts = [], onAnswer, onComplete, onExit }: QuestScreenProps) {
  const [run, setRun] = useState(() => startQuestRun(queue));
  const [feedback, setFeedback] = useState<{ fast: boolean } | null>(null);
  const [repair, setRepair] = useState<Question | null>(null);
  const [wobbling, setWobbling] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [introduced, setIntroduced] = useState<ReadonlySet<FactId>>(new Set());
  const lastAt = useRef(performance.now());
  const completed = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const wobbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    if (wobbleTimer.current) clearTimeout(wobbleTimer.current);
  }, []);

  const done = isQuestDone(run);
  // Quest finished: start the launch beat once the last feedback is out of the way.
  useEffect(() => {
    if (done && !feedback && !repair && !wobbling && !launching && !completed.current) {
      setLaunching(true);
      play('launch');
    }
  }, [done, feedback, repair, wobbling, launching]);
  // Then hand over to the next step after a short launch.
  useEffect(() => {
    if (!launching) return;
    const t = setTimeout(() => {
      if (completed.current) return;
      completed.current = true;
      onCompleteRef.current({ answered: run.answered, lightning: run.lightning });
    }, prefersReducedMotion() ? REDUCED_LAUNCH_MS : LAUNCH_MS);
    return () => clearTimeout(t);
  }, [launching, run.answered, run.lightning]);

  const q = currentQuestion(run);

  const handleAnswer = (r: AnswerResult) => {
    if (!q || feedback || wobbling) return;
    const now = performance.now();
    const raw = (now - lastAt.current) / 1000;
    const activeSeconds = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    lastAt.current = now;
    const ans: AnswerInput = { correct: r.correct, responseMs: r.responseMs, interrupted: r.interrupted };
    const fast = isFastAnswer(ans);
    onAnswer(q.factId, ans, activeSeconds);
    setRun(recordQuestResult(run, r.correct, fast, rng));
    if (r.correct) {
      play(fast ? 'lightning' : 'correct');
      setFeedback({ fast });
      feedbackTimer.current = setTimeout(() => {
        feedbackTimer.current = null;
        setFeedback(null);
      }, FEEDBACK_MS);
    } else {
      play('wrong');
      if (prefersReducedMotion()) {
        setRepair(q);
      } else {
        setWobbling(true);
        wobbleTimer.current = setTimeout(() => {
          wobbleTimer.current = null;
          setWobbling(false);
          setRepair(q);
        }, WOBBLE_MS);
      }
    }
  };

  let content: React.ReactNode = null;
  if (launching) {
    content = (
      <div className={styles.feedback}>
        <Rocket parts={parts} size={96} state="boost" />
        <p className={styles.correct} role="status">Blast off!</p>
      </div>
    );
  } else if (wobbling) {
    content = (
      <div className={styles.feedback}>
        <Rocket parts={parts} size={96} state="wobble" />
        <p className={styles.correct} role="status">Whoops, wobbly! Let's fix it.</p>
      </div>
    );
  } else if (feedback) {
    content = (
      <div className={styles.feedback}>
        {feedback.fast && <LightningBurst />}
        <p className={styles.correct} role="status">Great!</p>
      </div>
    );
  } else if (repair) {
    content = <RepairScreen question={repair} onDone={() => setRepair(null)} />;
  } else if (q) {
    if (q.kind === 'discovery' && !introduced.has(q.factId)) {
      content = (
        <DiscoveryCard
          question={q}
          onContinue={() => setIntroduced((s) => new Set(s).add(q.factId))}
        />
      );
    } else {
      content = <QuestionCard key={`${run.index}-${q.factId}`} question={q} onAnswer={handleAnswer} />;
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.exit} onClick={onExit}>⟵ Map</button>
        <h1 className={styles.title}>{title}</h1>
      </header>
      <div className={styles.body}>
        <div className={styles.main}>{content}</div>
        <FuelGauge fraction={fuelFraction(run)} />
      </div>
    </div>
  );
}
